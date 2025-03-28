import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getIdeas from '@salesforce/apex/IdeasController.getIdeas';
import getComments from '@salesforce/apex/IdeasController.getComments';
import getStatusOptions from '@salesforce/apex/IdeasController.getStatusOptions';
import getCategoryOptions from '@salesforce/apex/IdeasController.getCategoryOptions';
import addComment from '@salesforce/apex/IdeasController.addComment';
import voteForIdea from '@salesforce/apex/IdeasController.voteForIdea';

export default class IdeasAdminDashboard extends LightningElement {
    // Track state variables
    @track ideas = [];
    @track filteredIdeas = [];
    @track statusOptions = [];
    @track categoryOptions = [];
    @track priorityOptions = [
        { label: 'High', value: 'high', color: 'slds-theme_error' },
        { label: 'Medium', value: 'medium', color: 'slds-theme_warning' },
        { label: 'Low', value: 'low', color: 'slds-theme_info' }
    ];
    
    @track searchQuery = '';
    @track statusFilter = 'All';
    @track categoryFilter = 'All';
    @track priorityFilter = 'All';
    @track activeTab = 'all';
    
    @track selectedIdea = null;
    @track isDetailModalOpen = false;
    @track isResponseModalOpen = false;
    @track responseText = '';
    
    @track isLoading = true;
    @track error;
    @track wiredIdeasResult;
    
    // Analytics data
    @track categoryDistribution = {};
    @track statusDistribution = {};
    @track priorityDistribution = {};
    @track monthlyTrend = {};
    @track topTags = [];
    
    // Pagination
    @track currentPage = 1;
    @track pageSize = 10;
    @track totalPages = 1;

    // Store processed data for chart heights
    @track processedMonthlyTrend = [];
    @track categoryDistributionItems = [];
    @track statusDistributionItems = [];
    @track priorityDistributionItems = [];
    
    // Wire methods to fetch data
    @wire(getIdeas)
    wiredIdeas(result) {
        this.wiredIdeasResult = result;
        this.isLoading = true;
        
        if (result.data) {
            // Process ideas data
            this.ideas = JSON.parse(JSON.stringify(result.data));
            
            // Add priority field (not in standard Idea object)
            this.ideas = this.ideas.map(idea => {
                // Assign priority based on points (just for demo)
                let priority = 'low';
                if (idea.points > 30) {
                    priority = 'high';
                } else if (idea.points > 15) {
                    priority = 'medium';
                }
                
                // Add tags array (not in standard Idea object)
                const tags = idea.category ? idea.category.split(';') : [];
                
                // Add status class
                const statusClass = this.getStatusClass(idea.status);
                
                return {
                    ...idea,
                    priority,
                    tags,
                    statusClass
                };
            });
            
            this.applyFilters();
            this.calculateAnalytics();
            this.isLoading = false;
        } else if (result.error) {
            this.error = result.error;
            this.showToast('Error', 'Error loading ideas: ' + this.error.body.message, 'error');
            this.isLoading = false;
        }
    }
    
    @wire(getStatusOptions)
    wiredStatusOptions({ error, data }) {
        if (data) {
            // Add "All" option
            this.statusOptions = [{ label: 'All', value: 'All' }].concat(data);
        } else if (error) {
            this.showToast('Error', 'Error loading status options: ' + error.body.message, 'error');
        }
    }
    
    @wire(getCategoryOptions)
    wiredCategoryOptions({ error, data }) {
        if (data) {
            // Add "All" option
            this.categoryOptions = ['All'].concat(data);
        } else if (error) {
            this.showToast('Error', 'Error loading category options: ' + error.body.message, 'error');
        }
    }
    
    // Lifecycle hooks
    connectedCallback() {
        // Initialize any additional data
    }
    
    // Event handlers
    handleSearchChange(event) {
        this.searchQuery = event.target.value;
        this.applyFilters();
    }
    
    handleStatusFilterChange(event) {
        this.statusFilter = event.detail.value;
        this.applyFilters();
    }
    
    handleCategoryFilterChange(event) {
        this.categoryFilter = event.detail.value;
        this.applyFilters();
    }
    
    handlePriorityFilterChange(event) {
        this.priorityFilter = event.detail.value;
        this.applyFilters();
    }
    
    handleTabChange(event) {
        this.activeTab = event.target.value;
        this.applyFilters();
    }
    
    handleIdeaSelect(event) {
        const ideaId = event.currentTarget.dataset.id;
        this.selectedIdea = this.ideas.find(idea => idea.id === ideaId);
        
        // Load comments for the selected idea
        this.loadComments(ideaId);
        
        this.isDetailModalOpen = true;
    }
    
    handleStatusChange(event) {
        const ideaId = event.currentTarget.dataset.id;
        const newStatus = event.detail.value;
        
        // In a real implementation, you would call an Apex method to update the status
        // For this demo, we'll just update the local state
        this.ideas = this.ideas.map(idea => {
            if (idea.id === ideaId) {
                return { 
                    ...idea, 
                    status: newStatus,
                    statusClass: this.getStatusClass(newStatus)
                };
            }
            return idea;
        });
        
        this.applyFilters();
        this.showToast('Success', 'Status updated successfully', 'success');
    }
    
    handlePriorityChange(event) {
        const ideaId = event.currentTarget.dataset.id;
        const newPriority = event.detail.value;
        
        // In a real implementation, you would call an Apex method to update the priority
        // For this demo, we'll just update the local state
        this.ideas = this.ideas.map(idea => {
            if (idea.id === ideaId) {
                return { ...idea, priority: newPriority };
            }
            return idea;
        });
        
        this.applyFilters();
        this.showToast('Success', 'Priority updated successfully', 'success');
    }
    
    handleAssignmentChange(event) {
        const ideaId = event.currentTarget.dataset.id;
        const staffMemberId = event.detail.value;
        
        // In a real implementation, you would call an Apex method to update the assignment
        // For this demo, we'll just update the local state
        this.ideas = this.ideas.map(idea => {
            if (idea.id === ideaId) {
                // Mock staff member data
                const staffMember = staffMemberId ? {
                    id: staffMemberId,
                    name: 'Jane Wilson',
                    email: 'jane.wilson@example.com',
                    avatar: '/resource/UserPhotos/jane_wilson.jpg',
                    department: 'Product Management'
                } : undefined;
                
                return { ...idea, assignedTo: staffMember };
            }
            return idea;
        });
        
        this.applyFilters();
        this.showToast('Success', 'Assignment updated successfully', 'success');
    }
    
    handleOpenResponseModal() {
        this.isDetailModalOpen = false;
        this.isResponseModalOpen = true;
    }
    
    handleResponseTextChange(event) {
        this.responseText = event.target.value;
    }
    
    handleSubmitResponse() {
        if (!this.selectedIdea || !this.responseText.trim()) return;
        
        this.isLoading = true;
        
        // Call Apex method to add comment
        addComment({ 
            ideaId: this.selectedIdea.id, 
            commentText: this.responseText 
        })
        .then(() => {
            // Refresh comments for the selected idea
            return this.loadComments(this.selectedIdea.id);
        })
        .then(() => {
            this.responseText = '';
            this.isResponseModalOpen = false;
            this.showToast('Success', 'Response submitted successfully', 'success');
        })
        .catch(error => {
            this.showToast('Error', 'Error submitting response: ' + error.body.message, 'error');
        })
        .finally(() => {
            this.isLoading = false;
        });
    }
    
    handleCloseModal() {
        this.isDetailModalOpen = false;
        this.isResponseModalOpen = false;
    }
    
    handleRefresh() {
        this.isLoading = true;
        refreshApex(this.wiredIdeasResult)
            .then(() => {
                this.showToast('Success', 'Data refreshed successfully', 'success');
            })
            .catch(error => {
                this.showToast('Error', 'Error refreshing data: ' + error.body.message, 'error');
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
    
    handlePrevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.applyFilters();
        }
    }
    
    handleNextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.applyFilters();
        }
    }

    handleResetFilters() {
        this.searchQuery = '';
        this.statusFilter = 'All';
        this.categoryFilter = 'All';
        this.priorityFilter = 'All';
        this.applyFilters();
    }

    handleRemoveAssignment(event) {
        const ideaId = event.currentTarget.dataset.id;
        this.handleAssignmentChange({
            currentTarget: { dataset: { id: ideaId } },
            detail: { value: null }
        });
    }
    
    // Helper methods
    loadComments(ideaId) {
        return getComments({ ideaId })
            .then(result => {
                // Process comments to add CSS class
                const processedComments = result.map(comment => ({
                    ...comment,
                    commentClass: this.getCommentClass(comment.isStaff)
                }));
                
                // Update the comments for the selected idea
                if (this.selectedIdea && this.selectedIdea.id === ideaId) {
                    this.selectedIdea = {
                        ...this.selectedIdea,
                        comments: processedComments
                    };
                }
                
                // Also update the comments in the ideas array
                this.ideas = this.ideas.map(idea => {
                    if (idea.id === ideaId) {
                        return {
                            ...idea,
                            comments: processedComments
                        };
                    }
                    return idea;
                });
                
                return result;
            })
            .catch(error => {
                this.showToast('Error', 'Error loading comments: ' + error.body.message, 'error');
                throw error;
            });
    }
    
    applyFilters() {
        if (!this.ideas) return;
        
        let filtered = [...this.ideas];
        
        // Apply search filter
        if (this.searchQuery) {
            const searchLower = this.searchQuery.toLowerCase();
            filtered = filtered.filter(idea => 
                idea.title.toLowerCase().includes(searchLower) || 
                idea.description.toLowerCase().includes(searchLower) ||
                idea.authorName.toLowerCase().includes(searchLower)
            );
        }
        
        // Apply status filter
        if (this.statusFilter !== 'All') {
            filtered = filtered.filter(idea => idea.status === this.statusFilter);
        }
        
        // Apply category filter
        if (this.categoryFilter !== 'All') {
            filtered = filtered.filter(idea => 
                idea.category && idea.category.includes(this.categoryFilter)
            );
        }
        
        // Apply priority filter
        if (this.priorityFilter !== 'All') {
            filtered = filtered.filter(idea => idea.priority === this.priorityFilter);
        }
        
        // Apply tab filter
        if (this.activeTab === 'assigned') {
            filtered = filtered.filter(idea => idea.assignedTo);
        } else if (this.activeTab === 'unassigned') {
            filtered = filtered.filter(idea => !idea.assignedTo);
        } else if (this.activeTab === 'high-priority') {
            filtered = filtered.filter(idea => idea.priority === 'high');
        } else if (this.activeTab === 'new') {
            filtered = filtered.filter(idea => idea.status === 'New');
        }
        
        // Calculate pagination
        this.totalPages = Math.ceil(filtered.length / this.pageSize);
        
        // Ensure current page is valid
        if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages || 1;
        }
        
        // Apply pagination
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.filteredIdeas = filtered.slice(startIndex, endIndex);
    }
    
    calculateAnalytics() {
        // Calculate category distribution
        this.categoryDistribution = this.ideas.reduce((acc, idea) => {
            const categories = idea.category ? idea.category.split(';') : ['Uncategorized'];
            categories.forEach(category => {
                acc[category] = (acc[category] || 0) + 1;
            });
            return acc;
        }, {});
        
        // Convert to array for template
        this.categoryDistributionItems = Object.entries(this.categoryDistribution).map(([name, count]) => {
            return { name, count };
        });
        
        // Calculate status distribution
        this.statusDistribution = this.ideas.reduce((acc, idea) => {
            acc[idea.status] = (acc[idea.status] || 0) + 1;
            return acc;
        }, {});
        
        // Convert to array for template
        this.statusDistributionItems = Object.entries(this.statusDistribution).map(([name, count]) => {
            return { name, count };
        });
        
        // Calculate priority distribution
        this.priorityDistribution = this.ideas.reduce((acc, idea) => {
            acc[idea.priority] = (acc[idea.priority] || 0) + 1;
            return acc;
        }, {});
        
        // Convert to array for template
        this.priorityDistributionItems = Object.entries(this.priorityDistribution).map(([name, count]) => {
            return { name, count };
        });
        
        // Calculate monthly trend
        this.monthlyTrend = this.ideas.reduce((acc, idea) => {
            const month = new Date(idea.createdDate).toLocaleString('default', { month: 'short' });
            acc[month] = (acc[month] || 0) + 1;
            return acc;
        }, {});
        
        // Process monthly trend for chart heights
        const entries = Object.entries(this.monthlyTrend);
        const maxCount = Math.max(...entries.map(entry => entry[1]));
        
        this.processedMonthlyTrend = entries.map(([month, count]) => {
            // Calculate height class based on percentage of max
            const heightPercentage = Math.round((count / maxCount) * 100);
            return {
                month,
                count,
                heightClass: `trend-bar-height-${heightPercentage}`
            };
        });
        
        // Calculate top tags
        const tagCounts = this.ideas.flatMap(idea => idea.tags).reduce((acc, tag) => {
            if (tag) {
                acc[tag] = (acc[tag] || 0) + 1;
            }
            return acc;
        }, {});
        
        this.topTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([tag, count]) => ({ tag, count }));
    }
    
    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: variant
            })
        );
    }

    // Helper method to get comment class based on isStaff
    getCommentClass(isStaff) {
        return isStaff 
            ? 'slds-box slds-box_xx-small slds-theme_shade' 
            : 'slds-box slds-box_xx-small slds-theme_default';
    }
    
    // Helper method to get status class
    getStatusClass(status) {
        if (status === 'New') {
            return 'status-new';
        } else if (status === 'Backlog') {
            return 'status-backlog';
        } else if (status === 'In Progress') {
            return 'status-in-progress';
        } else {
            return 'status-default';
        }
    }
    
    // Getters for computed values
    get isPrevDisabled() {
        return this.currentPage <= 1;
    }
    
    get isNextDisabled() {
        return this.currentPage >= this.totalPages;
    }
    
    get paginationText() {
        return `${this.currentPage} of ${this.totalPages}`;
    }
    
    get newIdeasCount() {
        return this.ideas.filter(idea => idea.status === 'New').length;
    }
    
    get inProgressIdeasCount() {
        return this.ideas.filter(idea => idea.status === 'In Progress').length;
    }
    
    get completedIdeasCount() {
        return this.ideas.filter(idea => idea.status === 'Completed').length;
    }
    
    get highPriorityIdeasCount() {
        return this.ideas.filter(idea => idea.priority === 'high').length;
    }
    
    get totalCommentsCount() {
        return this.ideas.reduce((total, idea) => total + idea.commentCount, 0);
    }
    
    get pendingResponseCount() {
        return this.ideas.filter(idea => 
            idea.status === 'New' || idea.status === 'Under Review'
        ).length;
    }
    
    get hasSelectedIdea() {
        return this.selectedIdea !== null;
    }
    
    get hasSelectedIdeaComments() {
        return this.selectedIdea && this.selectedIdea.comments && this.selectedIdea.comments.length > 0;
    }
    
    get hasFilteredIdeas() {
        return this.filteredIdeas && this.filteredIdeas.length > 0;
    }

    get detailModalClass() {
        return this.isDetailModalOpen ? 'slds-modal slds-fade-in-open' : 'slds-modal';
    }

    get staffOptions() {
        // Mock staff options for demo
        return [
            { label: 'Jane Wilson', value: 'staff-5' },
            { label: 'Michael Brown', value: 'staff-6' },
            { label: 'Sarah Davis', value: 'staff-7' }
        ];
    }

    get disableResponseButton() {
        return !this.responseText.trim();
    }
}