import { LightningElement, track, wire, api } from "lwc"
import { ShowToastEvent } from "lightning/platformShowToastEvent"
import { refreshApex } from "@salesforce/apex"
import getIdeas from "@salesforce/apex/IdeasController.getIdeas"
import createIdea from "@salesforce/apex/IdeasController.createIdea"
import voteForIdea from "@salesforce/apex/IdeasController.voteForIdea"
import addComment from "@salesforce/apex/IdeasController.addComment"
import getComments from "@salesforce/apex/IdeasController.getComments"
import getCategoryOptions from "@salesforce/apex/IdeasController.getCategoryOptions"
import getStatusOptions from "@salesforce/apex/IdeasController.getStatusOptions"
import currentUserPhotoUrl from "@salesforce/apex/IdeasController.getCurrentUserPhotoUrl"


export default class IdeasComponent extends LightningElement {
    @track ideas = []
    @track filteredIdeas = []
    @track categoryOptions = []
    @track statusOptions = []
    @track currentUserPhotoUrl = ""
    @track showOptions = [
        { label: "All", value: "All" },
        { label: "My Ideas", value: "My Ideas" },
        { label: "Commented by me", value: "Commented by me" },
        { label: "Voted by me", value: "Voted by me" },
    ]
    @track sortOptions = [
        { label: "Popular", value: "Popular" },
        { label: "Recent", value: "Recent" },
        { label: "Most Voted", value: "Most Voted" },
    ]

    @track searchQuery = ""
    @track selectedShow = "All"
    @track selectedCategory = "All"
    @track selectedStatus = "All"
    @track selectedSort = "Popular"
    @track expandedCommentsMap = {}
    @track newCommentsMap = {}
    @track isLoading = true
    @track error
    @track wiredIdeasResult
    @track showShowFilter = false
    @track showCategoryFilter = false
    @track showStatusFilter = false

    // New idea form
    @track isNewIdeaModalOpen = false
    @track newIdea = {
        title: "",
        category: "",
        description: "",
    }

    // Pagination
    @track currentPage = 1
    @track totalPages = 1
    @track recordsPerPage = 10

    // Processed ideas with UI state
    @track processedIdeas = []

    // Zone 
    @api zoneId

    connectedCallback() {
        this.loadCategoryOptions()
        this.loadStatusOptions()

        // Initialize options with customClass
        this.showOptions = this.showOptions.map((option) => {
            return {
                ...option,
                customClass: this.getShowOptionClass(option.value),
            }
        })

        this.statusOptions = this.statusOptions.map((option) => {
            return {
                ...option,
                customClass: this.getStatusOptionClass(option.value),
            }
        })

    }

    @wire(getIdeas)
    wiredIdeas(result) {
        this.wiredIdeasResult = result
        this.isLoading = true

        if (result.data) {
            this.ideas = JSON.parse(JSON.stringify(result.data))
            this.applyFilters()
            this.isLoading = false
        } else if (result.error) {
            this.error = result.error
            this.showToast("Error", "Error loading ideas: " + this.error.body.message, "error")
            this.isLoading = false
        }
    }

    @wire(currentUserPhotoUrl)
    currentUserPhotoUrl(result) {
        if (result.data) {
            this.currentUserPhotoUrl = result.data
        } else if (result.error) {
            this.error = result.error
            this.showToast("Error", "Error loading user photo: " + this.error.body.message, "error")
        }
    }

    loadCategoryOptions() {
        getCategoryOptions()
            .then((result) => {
                this.categoryOptions = result.map((category) => {
                    return {
                        label: category,
                        value: category,
                        customClass: this.getCategoryOptionClass(category),
                    }
                })
                // Add "All" option at the beginning
                this.categoryOptions.unshift({
                    label: "All",
                    value: "All",
                    customClass: this.getCategoryOptionClass("All"),
                })
            })
            .catch((error) => {
                this.showToast("Error", "Error loading categories: " + error.body.message, "error")
            })
    }

    loadStatusOptions() {
        getStatusOptions()
            .then((result) => {
                this.statusOptions = result.map((status) => {
                    return {
                        label: status.label,
                        value: status.value,
                        customClass: this.getStatusOptionClass(status.value),
                    }
                })
                // Add "All" option at the beginning
                this.statusOptions.unshift({
                    label: "All",
                    value: "All",
                    customClass: this.getStatusOptionClass("All"),
                })
            })
            .catch((error) => {
                this.showToast("Error", "Error loading statuses: " + error.body.message, "error")
            })
    }

    // Filter toggle handlers
    toggleShowFilter() {
        this.showShowFilter = !this.showShowFilter
    }

    toggleCategoryFilter() {
        this.showCategoryFilter = !this.showCategoryFilter
    }

    toggleStatusFilter() {
        this.showStatusFilter = !this.showStatusFilter
    }

    // Filter change handlers
    handleShowFilterChange(event) {
        this.selectedShow = event.target.dataset.value
        this.applyFilters()
    }

    handleCategoryFilterChange(event) {
        this.selectedCategory = event.target.dataset.value
        this.applyFilters()
    }

    handleStatusFilterChange(event) {
        this.selectedStatus = event.target.dataset.value
        this.applyFilters()
    }

    handleSortChange(event) {
        this.selectedSort = event.detail.value
        this.applyFilters()
    }

    handleSearchChange(event) {
        this.searchQuery = event.target.value
        this.applyFilters()
    }

    applyFilters() {
        if (!this.ideas) return

        let filtered = [...this.ideas]

        // Apply search filter
        if (this.searchQuery) {
            const searchLower = this.searchQuery.toLowerCase()
            filtered = filtered.filter(
                (idea) =>
                    idea.title.toLowerCase().includes(searchLower) || idea.description.toLowerCase().includes(searchLower),
            )
        }

        // Apply show filter
        if (this.selectedShow !== "All") {
            // This would need actual user ID and organization ID from Salesforce
            // For now, just simulating the filter
            if (this.selectedShow === "My Ideas") {
                filtered = filtered.filter((idea) => idea.isCurrentUserAuthor)
            } else if (this.selectedShow === "My Organization") {
                filtered = filtered.filter((idea) => idea.isFromCurrentUserOrg)
            } else if (this.selectedShow === "Commented by me") {
                filtered = filtered.filter((idea) => idea.isCommentedByCurrentUser)
            } else if (this.selectedShow === "Voted by me") {
                filtered = filtered.filter((idea) => idea.isVotedByCurrentUser)
            }
        }

        // Apply category filter
        if (this.selectedCategory !== "All") {
            filtered = filtered.filter((idea) => idea.category === this.selectedCategory)
        }

        // Apply status filter
        if (this.selectedStatus !== "All") {
            filtered = filtered.filter((idea) => idea.status === this.selectedStatus)
        }

        // Apply sorting
        if (this.selectedSort === "Popular") {
            filtered.sort((a, b) => b.points - a.points)
        } else if (this.selectedSort === "Recent") {
            filtered.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))
        } else if (this.selectedSort === "Most Voted") {
            filtered.sort((a, b) => b.voteCount - a.voteCount)
        }

        // Calculate pagination
        this.totalPages = Math.ceil(filtered.length / this.recordsPerPage)

        // Ensure current page is valid
        if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages || 1
        }

        // Apply pagination
        const startIndex = (this.currentPage - 1) * this.recordsPerPage
        const endIndex = startIndex + this.recordsPerPage
        this.filteredIdeas = filtered.slice(startIndex, endIndex)

        // Update options with customClass
        this.showOptions = this.showOptions.map((option) => {
            return {
                ...option,
                customClass: this.getShowOptionClass(option.value),
            }
        })

        this.categoryOptions = this.categoryOptions.map((option) => {
            return {
                ...option,
                customClass: this.getCategoryOptionClass(option.value),
            }
        })

        this.statusOptions = this.statusOptions.map((option) => {
            return {
                ...option,
                customClass: this.getStatusOptionClass(option.value),
            }
        })

        // Process ideas for UI display
        this.processIdeasForUI()
    }

    processIdeasForUI() {
        this.processedIdeas = this.filteredIdeas.map((idea) => {
            // Create a new object with all the properties from the original idea
            const processedIdea = { ...idea }

            // Add UI state properties
            processedIdea.isCommentsExpanded = this.expandedCommentsMap[idea.id] || false
            processedIdea.newCommentText = this.newCommentsMap[idea.id] || ""
            processedIdea.hasNewCommentText = !!this.newCommentsMap[idea.id]
            processedIdea.commentCountText = this.getCommentCountText(idea.commentCount)

            return processedIdea
        })
    }

    // Pagination handlers
    handlePrevPage() {
        if (this.currentPage > 1) {
            this.currentPage--
            this.applyFilters()
        }
    }

    handleNextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++
            this.applyFilters()
        }
    }

    // Voting handlers
    handleVote(event) {
        const ideaId = event.currentTarget.dataset.id
        const voteType = event.currentTarget.dataset.vote

        this.isLoading = true
        voteForIdea({ ideaId: ideaId, voteType: voteType })
            .then(() => {
                return refreshApex(this.wiredIdeasResult)
            })
            .catch((error) => {
                this.showToast("Error", "Error voting: " + error.body.message, "error")
            })
            .finally(() => {
                this.isLoading = false
            })
    }

    // Comments handlers
    toggleComments(event) {
        const ideaId = event.currentTarget.dataset.id

        // Toggle the expanded state
        this.expandedCommentsMap = {
            ...this.expandedCommentsMap,
            [ideaId]: !this.expandedCommentsMap[ideaId],
        }

        // If expanding, load comments
        if (this.expandedCommentsMap[ideaId]) {
            this.loadComments(ideaId)
        }

        // Update the processed ideas
        this.processIdeasForUI()
    }

    loadComments(ideaId) {
        getComments({ ideaId: ideaId })
            .then((result) => {
                const ideas = JSON.parse(JSON.stringify(this.ideas))
                const ideaIndex = ideas.findIndex((idea) => idea.id === ideaId)

                if (ideaIndex !== -1) {
                    ideas[ideaIndex].comments = result
                    this.ideas = ideas
                    this.applyFilters()
                }
            })
            .catch((error) => {
                this.showToast("Error", "Error loading comments: " + error.body.message, "error")
            })
    }

    handleCommentChange(event) {
        const ideaId = event.currentTarget.dataset.id
        this.newCommentsMap = {
            ...this.newCommentsMap,
            [ideaId]: event.target.value,
        }

        // Update the processed ideas
        this.processIdeasForUI()
    }

    submitComment(event) {
        const ideaId = event.currentTarget.dataset.id
        const commentText = this.newCommentsMap[ideaId]

        if (!commentText || !commentText.trim()) return

        this.isLoading = true
        addComment({ ideaId: ideaId, commentText: commentText })
            .then(() => {
                // Clear the comment input
                this.newCommentsMap = {
                    ...this.newCommentsMap,
                    [ideaId]: "",
                }

                // Reload comments
                this.loadComments(ideaId)
                this.showToast("Success", "Comment added successfully", "success")
            })
            .catch((error) => {
                this.showToast("Error", "Error adding comment: " + error.body.message, "error")
            })
            .finally(() => {
                this.isLoading = false
            })
    }

    // New idea modal handlers
    openNewIdeaModal() {
        this.isNewIdeaModalOpen = true
    }

    closeNewIdeaModal() {
        this.isNewIdeaModalOpen = false
    }

    handleNewIdeaChange(event) {
        const field = event.target.name
        this.newIdea = {
            ...this.newIdea,
            [field]: event.target.value,
        }
    }

    submitNewIdea() {
        // Validate form
        if (!this.newIdea.title.trim() || !this.newIdea.category || !this.newIdea.description.trim()) {
            this.showToast("Error", "Please fill in all required fields", "error")
            return
        }

        this.isLoading = true
        createIdea({
            title: this.newIdea.title,
            category: this.newIdea.category,
            description: this.newIdea.description,
        })
            .then(() => {
                this.showToast("Success", "Idea submitted successfully", "success")

                // Reset form and close modal
                this.newIdea = {
                    title: "",
                    category: "",
                    description: "",
                }
                this.isNewIdeaModalOpen = false

                // Refresh ideas list
                return refreshApex(this.wiredIdeasResult)
            })
            .catch((error) => {
                this.showToast("Error", "Error submitting idea: " + error.body.message, "error")
            })
            .finally(() => {
                this.isLoading = false
            })
    }

    // Helper methods
    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: variant,
            }),
        )
    }

    // Getters for template
    get isPrevDisabled() {
        return this.currentPage <= 1
    }

    get isNextDisabled() {
        return this.currentPage >= this.totalPages
    }

    get paginationText() {
        return `${this.currentPage} of ${this.totalPages}`
    }

    get hasIdeas() {
        return this.processedIdeas && this.processedIdeas.length > 0
    }

    get showFilterClass() {
        return this.showShowFilter ? "slds-show" : "slds-hide"
    }

    get categoryFilterClass() {
        return this.showCategoryFilter ? "slds-show" : "slds-hide"
    }

    get statusFilterClass() {
        return this.showStatusFilter ? "slds-show" : "slds-hide"
    }

    get showFilterIcon() {
        return this.showShowFilter ? "utility:chevronup" : "utility:chevrondown"
    }

    get categoryFilterIcon() {
        return this.showCategoryFilter ? "utility:chevronup" : "utility:chevrondown"
    }

    get statusFilterIcon() {
        return this.showStatusFilter ? "utility:chevronup" : "utility:chevrondown"
    }

    // For Show filter options
    getShowOptionClass(optionValue) {
        return optionValue === this.selectedShow ? "selected" : ""
    }

    // For Category filter options
    getCategoryOptionClass(optionValue) {
        return optionValue === this.selectedCategory ? "selected" : ""
    }

    // For Status filter options
    getStatusOptionClass(optionValue) {
        return optionValue === this.selectedStatus ? "selected" : ""
    }

    // For comment count text
    getCommentCountText(count) {
        return count === 1 ? "comment" : "comments"
    }
}
