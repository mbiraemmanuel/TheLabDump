import { LightningElement, track, wire } from "lwc"
import { ShowToastEvent } from "lightning/platformShowToastEvent"
import { refreshApex } from "@salesforce/apex"
import getIdeas from "@salesforce/apex/IdeasController.getIdeas"
import getComments from "@salesforce/apex/IdeasController.getComments"
import getStatusOptions from "@salesforce/apex/IdeasController.getStatusOptions"
import getCategoryOptions from "@salesforce/apex/IdeasController.getCategoryOptions"
import getPriorityOptions from "@salesforce/apex/IdeasController.getPriorityOptions"
import addComment from "@salesforce/apex/IdeasController.addComment"
import getUsers from "@salesforce/apex/IdeasController.getUsers"
import updateIdea from "@salesforce/apex/IdeasController.updateIdea"
import assignToMe from "@salesforce/apex/IdeasController.assignToMe"
import Id from "@salesforce/user/Id" // Import current user Id

export default class IdeasAdminDashboard extends LightningElement {
  // Track state variables
  @track ideas = []
  @track filteredIdeas = []
  @track statusOptions = []
  @track statusOptionsWithoutAll = []

  @track categoryOptions = []
  @track categoryOptionsWithoutAll = []

  @track priorityOptions = []
  @track priorityOptionsWithoutAll = []

  @track searchQuery = ""
  @track statusFilter = "All"
  @track categoryFilter = "All"
  @track priorityFilter = "All"
  @track activeTab = "all"

  @track selectedIdea = null
  @track isDetailModalOpen = false
  @track isResponseModalOpen = false
  @track responseText = ""

  @track isLoading = true
  @track error
  @track wiredIdeasResult

  // Analytics data
  @track categoryDistribution = {}
  @track statusDistribution = {}
  @track priorityDistribution = {}
  @track monthlyTrend = {}
  @track topTags = []

  // Pagination
  @track currentPage = 1
  @track pageSize = 10
  @track totalPages = 1

  // Store processed data for chart heights
  @track processedMonthlyTrend = []
  @track categoryDistributionItems = []
  @track statusDistributionItems = []
  @track priorityDistributionItems = []

  @track richTextFormats = [
    "font",
    "size",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "indent",
    "align",
    "link",
    "clean",
    "table",
    "header",
  ]

  // Add these properties to track the dropdown state
  @track searchTerm = ""
  @track filteredUserOptions = []
  @track isUserSearchOpen = false
  @track noSearchResults = false

  // Add this property to track state
  @track userOptions = []
  @track selectedUserId = ""
  @track tempSelectedUserId = null

  // Store current user Id
  currentUserId = Id

  // Add the statsData property to the component
  @track statsData = {
    totalIdeas: 0,
    pendingResponse: 0,
    implementationRate: 0,
  }

  // Wire methods to fetch data
  @wire(getIdeas)
  wiredIdeas(result) {
    this.wiredIdeasResult = result
    this.isLoading = true

    if (result.data) {
      // Process ideas data
      this.ideas = JSON.parse(JSON.stringify(result.data))

      // Add priority field (not in standard Idea object)
      this.ideas = this.ideas.map((idea) => {

        const tags = idea.category ? idea.category.split(";") : []
        const statusClass = this.getStatusClass(idea.status)
        const description = idea.description || ""

        return {
          ...idea,
          tags,
          statusClass,
          description,
        }
      })

      this.applyFilters()
      this.calculateAnalytics()
      this.calculateStatistics()

      this.isLoading = false
    } else if (result.error) {
      this.error = result.error
      this.showToast("Error", "Error loading ideas: " + this.error.body.message, "error")
      this.isLoading = false
    }
  }

  @wire(getStatusOptions)
  wiredStatusOptions({ error, data }) {
    if (data) {
      // Add "All" option
      this.statusOptions = [{ label: "All", value: "All" }].concat(data)
      this.statusOptionsWithoutAll = [ ...data ]
    } else if (error) {
      this.showToast("Error", "Error loading status options: " + error.body.message, "error")
    }
  }

  @wire(getCategoryOptions)
  wiredCategoryOptions({ error, data }) {
    if (data) {
      // Add "All" option and format for combobox
      this.categoryOptions = [{ label: "All", value: "All" }].concat(
        data.map((category) => ({ label: category, value: category })),
      )
      this.categoryOptionsWithoutAll = [ ...data.map((category) => ({ label: category, value: category })) ]
    } else if (error) {
      this.showToast("Error", "Error loading category options: " + error.body.message, "error")
    }
  }

  @wire(getPriorityOptions)
  wiredPriorityOptions({ error, data }) {
    if (data) {
      // Add "All" option and format for combobox
      this.priorityOptions = [{ label: "All", value: "All" }].concat(data)
      this.priorityOptionsWithoutAll= [ ...data ]

    } else if (error) {
      this.showToast("Error", "Error loading priority options: " + error.body.message, "error")
    }
  }

  // Add this wire method after the other wire methods
  @wire(getUsers)
  wiredUsers({ error, data }) {
    if (data) {
      this.userOptions = data.map((user) => ({
        label: user.Name,
        value: user.Id,
        photoUrl: user.SmallPhotoUrl,
        department: user.Department || "Not Specified",
      }))
    } else if (error) {
      this.showToast("Error", "Error loading users: " + error.body.message, "error")
    }
  }

  // Lifecycle hooks
  connectedCallback() {
    // Initialize any additional data
  }

  // Event handlers
  handleSearchChange(event) {
    this.searchQuery = event.target.value
    this.applyFilters()
  }

  handleStatusFilterChange(event) {
    this.statusFilter = event.detail.value
    this.applyFilters()
  }

  handleCategoryFilterChange(event) {
    this.categoryFilter = event.detail.value
    this.applyFilters()
  }

  handlePriorityFilterChange(event) {
    this.priorityFilter = event.detail.value
    this.applyFilters()
  }

  handleTabChange(event) {
    this.activeTab = event.target.value
    this.applyFilters()
  }

  handleIdeaSelect(event) {
    const ideaId = event.currentTarget.dataset.id
    this.selectedIdea = this.ideas.find((idea) => idea.id === ideaId)

    // Load comments for the selected idea
    this.loadComments(ideaId)

    this.isDetailModalOpen = true
  }

  handleStatusChange(event) {
    const ideaId = event.currentTarget.dataset.id
    const newStatus = event.detail.value || event.currentTarget.value

    this.isLoading = true

    // Call Apex method to update the status
    updateIdea({ ideaId, fieldName: "status", newValue: newStatus })
      .then(() => {
        // Update local state
        this.ideas = this.ideas.map((idea) => {
          if (idea.id === ideaId) {
            return {
              ...idea,
              status: newStatus,
              statusClass: this.getStatusClass(newStatus),
            }
          }
          return idea
        })

        this.applyFilters()
        this.showToast("Success", "Status updated successfully", "success")
      })
      .catch((error) => {
        this.showToast("Error", "Error updating status: " + error.body.message, "error")
      })
      .finally(() => {
        this.isLoading = false
      })
  }

  handlePriorityChange(event) {
    const ideaId = event.currentTarget.dataset.id
    const newPriority = event.detail.value || event.currentTarget.value

    this.isLoading = true

    // Call Apex method to update the priority
    updateIdea({ ideaId, fieldName: "priority", newValue: newPriority })
      .then(() => {
        // Update local state
        this.ideas = this.ideas.map((idea) => {
          if (idea.id === ideaId) {
            return { ...idea, priority: newPriority }
          }
          return idea
        })

        this.applyFilters()
        this.showToast("Success", "Priority updated successfully", "success")
      })
      .catch((error) => {
        this.showToast("Error", "Error updating priority: " + error.body.message, "error")
      })
      .finally(() => {
        this.isLoading = false
      })
  }

  // Add these methods for the searchable dropdown
  handleUserSearch(event) {
    this.searchTerm = event.target.value

    if (this.searchTerm.length > 0) {
      this.isUserSearchOpen = true
      this.isLoading = true

      // Filter users based on search term
      this.filteredUserOptions = this.userOptions.filter((user) =>
        user.label.toLowerCase().includes(this.searchTerm.toLowerCase()),
      )

      this.noSearchResults = this.filteredUserOptions.length === 0
      this.isLoading = false
    } else {
      // If search is empty, show all users (limited to first 5)
      this.filteredUserOptions = this.userOptions.slice(0, 5)
      this.noSearchResults = false
    }
  }

  handleUserSearchFocus() {
    // Show dropdown when input is focused
    this.isUserSearchOpen = true

    // If no search term, show first 5 users
    if (!this.searchTerm) {
      this.filteredUserOptions = this.userOptions.slice(0, 5)
    }
  }

  handleUserSearchBlur() {
    // Use setTimeout to allow click events to fire before closing dropdown
    setTimeout(() => {
      this.isUserSearchOpen = false
    }, 300)
  }

  handleUserSelect(event) {
    const userId = event.currentTarget.dataset.id
    const selectedUser = this.userOptions.find((user) => user.value === userId)

    if (selectedUser) {
      this.searchTerm = selectedUser.label
      this.isUserSearchOpen = false

      // Update the assignment
      this.updateAssignment(this.selectedIdea.id, userId, selectedUser)
    }
    // Reset the search term
    this.searchTerm = ""
  }

  // Helper method to update assignment
  updateAssignment(ideaId, userId, selectedUser) {
    this.isLoading = true

    // Call Apex method to update the assignment
    updateIdea({ ideaId, fieldName: "assignedto", newValue: userId || "" })
      .then(() => {
        // Update local state
        this.ideas = this.ideas.map((idea) => {
          if (idea.id === ideaId) {
            return {
              ...idea,
              assignedTo: selectedUser ? selectedUser.label : null,
              assignedToPhotoUrl: selectedUser ? selectedUser.photoUrl : null,
            }
          }
          return idea
        })

        // If this is the selected idea, update it too
        if (this.selectedIdea && this.selectedIdea.id === ideaId) {
          this.selectedIdea = {
            ...this.selectedIdea,
            assignedTo: selectedUser ? selectedUser.label : null,
            assignedToPhotoUrl: selectedUser ? selectedUser.photoUrl : null,
          }
        }

        this.applyFilters()
        this.showToast("Success", "Assignment updated successfully", "success")
      })
      .catch((error) => {
        this.showToast("Error", "Error updating assignment: " + error.body.message, "error")
      })
      .finally(() => {
        this.isLoading = false
      })
  }

  // Update the handleRemoveAssignment method
  handleRemoveAssignment(event) {
    const ideaId = event.currentTarget.dataset.id

    // Clear the search term
    this.searchTerm = ""

    // Update assignment with null user
    this.updateAssignment(ideaId, null, null)
  }

  // Update the handleAssignToMe method
  handleAssignToMe(event) {
    const ideaId = event.currentTarget.dataset.id

    this.isLoading = true

    // Call Apex method to assign to current user
    assignToMe({ ideaId })
      .then(() => {
        // Find the current user from our options
        const currentUser = this.userOptions.find((user) => user.value === this.currentUserId)

        if (currentUser) {
          // Update the search term if this is the selected idea
          if (this.selectedIdea && this.selectedIdea.id === ideaId) {
            this.searchTerm = currentUser.label
          }

          // Update local state
          this.ideas = this.ideas.map((idea) => {
            if (idea.id === ideaId) {
              return {
                ...idea,
                assignedTo: currentUser.label,
                assignedToPhotoUrl: currentUser.photoUrl,
              }
            }
            return idea
          })

          this.applyFilters()
          this.showToast("Success", "Idea assigned to you successfully", "success")
        }
      })
      .catch((error) => {
        this.showToast("Error", "Error assigning idea: " + error.body.message, "error")
      })
      .finally(() => {
        this.isLoading = false
      })
  }

  handleOpenResponseModal(event) {
    const ideaId = event.currentTarget.dataset.id
    if (ideaId && !this.selectedIdea) {
      // If called from the table and no idea is selected yet
      this.selectedIdea = this.ideas.find((idea) => idea.id === ideaId)
    }
    this.isDetailModalOpen = false
    this.isResponseModalOpen = true
  }

  handleResponseTextChange(event) {
    this.responseText = event.target.value
  }

  handleSubmitResponse() {
    if (!this.selectedIdea || !this.responseText.trim()) return

    this.isLoading = true

    // Call Apex method to add comment
    addComment({
      ideaId: this.selectedIdea.id,
      commentText: this.responseText,
    })
      .then(() => {
        // Refresh comments for the selected idea
        return this.loadComments(this.selectedIdea.id)
      })
      .then(() => {
        this.responseText = ""
        this.isResponseModalOpen = false
        this.showToast("Success", "Response submitted successfully", "success")
      })
      .catch((error) => {
        this.showToast("Error", "Error submitting response: " + error.body.message, "error")
      })
      .finally(() => {
        this.isLoading = false
      })

      // Close the response modal
      this.handleCloseModal()
  }

  handleCloseModal() {
    this.isDetailModalOpen = false
    this.isResponseModalOpen = false
    this.selectedIdea = null // Also reset the selected idea to fully close the modal
  }

  handleRefresh() {
    this.isLoading = true
    refreshApex(this.wiredIdeasResult)
      .then(() => {
        this.showToast("Success", "Data refreshed successfully", "success")
      })
      .catch((error) => {
        this.showToast("Error", "Error refreshing data: " + error.body.message, "error")
      })
      .finally(() => {
        this.isLoading = false
      })
  }

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

  handleResetFilters() {
    this.searchQuery = ""
    this.statusFilter = "All"
    this.categoryFilter = "All"
    this.priorityFilter = "All"
    this.applyFilters()
  }

  // Helper methods
  loadComments(ideaId) {
    return getComments({ ideaId })
      .then((result) => {
        // Process comments to add CSS class
        const processedComments = result.map((comment) => ({
          ...comment,
          commentClass: this.getCommentClass(comment.isStaff),
          // Ensure text is properly formatted for rich text display
          text: comment.text || "",
        }))

        // Update the comments for the selected idea
        if (this.selectedIdea && this.selectedIdea.id === ideaId) {
          this.selectedIdea = {
            ...this.selectedIdea,
            comments: processedComments,
          }
        }

        // Also update the comments in the ideas array
        this.ideas = this.ideas.map((idea) => {
          if (idea.id === ideaId) {
            return {
              ...idea,
              comments: processedComments,
            }
          }
          return idea
        })

        return result
      })
      .catch((error) => {
        this.showToast("Error", "Error loading comments: " + error.body.message, "error")
        throw error
      })
  }

  // Update the applyFilters method to correctly filter assigned and unassigned ideas
  applyFilters() {
    if (!this.ideas) return

    let filtered = [...this.ideas]

    // Apply search filter
    if (this.searchQuery) {
      const searchLower = this.searchQuery.toLowerCase()
      filtered = filtered.filter(
        (idea) =>
          idea.title.toLowerCase().includes(searchLower) ||
          idea.description.toLowerCase().includes(searchLower) ||
          idea.authorName.toLowerCase().includes(searchLower),
      )
    }

    // Apply status filter
    if (this.statusFilter !== "All") {
      filtered = filtered.filter((idea) => idea.status === this.statusFilter)
    }

    // Apply category filter
    if (this.categoryFilter !== "All") {
      filtered = filtered.filter((idea) => idea.category && idea.category.includes(this.categoryFilter))
    }

    // Apply priority filter
    if (this.priorityFilter !== "All") {
      filtered = filtered.filter((idea) => idea.priority === this.priorityFilter)
    }

    // Apply tab filter
    if (this.activeTab === "assigned") {
      // Only show ideas that have a non-empty assignedTo value
      filtered = filtered.filter((idea) => idea.assignedTo && idea.assignedTo.trim() !== "")
    } else if (this.activeTab === "unassigned") {
      // Only show ideas that have no assignedTo value or an empty string
      filtered = filtered.filter((idea) => !idea.assignedTo || idea.assignedTo.trim() === "")
    } else if (this.activeTab === "scheduled") {
      filtered = filtered.filter((idea) => idea.status === "Scheduled")
    } else if (this.activeTab === "backlog") {
      filtered = filtered.filter((idea) => idea.status === "Backlog")
    } else if (this.activeTab === "new") {
      filtered = filtered.filter((idea) => idea.status === "New")
    } else if (this.activeTab === "mywork") {
      // Find the current user's name
      const currentUser = this.userOptions.find((user) => user.value === this.currentUserId)
      const currentUserName = currentUser ? currentUser.label : null

      // Only show ideas assigned to the current user by exact name match
      filtered = filtered.filter(
        (idea) => idea.assignedTo && currentUserName && idea.assignedTo.trim() === currentUserName.trim(),
      )
    }

    // Calculate pagination
    this.totalPages = Math.ceil(filtered.length / this.pageSize)

    // Ensure current page is valid
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1
    }

    // Apply pagination
    const startIndex = (this.currentPage - 1) * this.pageSize
    const endIndex = startIndex + this.pageSize
    this.filteredIdeas = filtered.slice(startIndex, endIndex)
  }

  // Update the calculateAnalytics method to populate the statsData object
 
  calculateAnalytics() {
    // Calculate category distribution
    this.categoryDistribution = this.ideas.reduce((acc, idea) => {
      const categories = idea.category ? idea.category.split(";") : ["Uncategorized"]
      categories.forEach((category) => {
        acc[category] = (acc[category] || 0) + 1
      })
      return acc
    }, {})

    // Convert to array for template
    this.categoryDistributionItems = Object.entries(this.categoryDistribution).map(([name, count]) => {
      return { name, count }
    })

    // Calculate status distribution
    this.statusDistribution = this.ideas.reduce((acc, idea) => {
      acc[idea.status] = (acc[idea.status] || 0) + 1
      return acc
    }, {})

    // Convert to array for template
    this.statusDistributionItems = Object.entries(this.statusDistribution).map(([name, count]) => {
      return { name, count }
    })

    // Calculate priority distribution
    this.priorityDistribution = this.ideas.reduce((acc, idea) => {
      acc[idea.priority] = (acc[idea.priority] || 0) + 1
      return acc
    }, {})

    // Convert to array for template
    this.priorityDistributionItems = Object.entries(this.priorityDistribution).map(([name, count]) => {
      return { name, count }
    })

    // Calculate monthly trend
    this.monthlyTrend = this.ideas.reduce((acc, idea) => {
      const month = new Date(idea.createdDate).toLocaleString("default", { month: "short" })
      acc[month] = (acc[month] || 0) + 1
      return acc
    }, {})

    // Process monthly trend for chart heights
    const entries = Object.entries(this.monthlyTrend)
    const maxCount = Math.max(...entries.map((entry) => entry[1]))

    this.processedMonthlyTrend = entries.map(([month, count]) => {
      // Calculate height class based on percentage of max
      const heightPercentage = Math.round((count / maxCount) * 100)
      // Round to nearest 10
      const roundedPercentage = Math.ceil(heightPercentage / 10) * 10
      return {
        month,
        count,
        heightClass: `trend-bar-height-${roundedPercentage}`,
      }
    })

    // Calculate top tags
    const tagCounts = this.ideas
      .flatMap((idea) => idea.tags)
      .reduce((acc, tag) => {
        if (tag) {
          acc[tag] = (acc[tag] || 0) + 1
        }
        return acc
      }, {})

    this.topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }))
  }

  // Add a helper method to calculate implementation rate
  calculateImplementationRate() {
    const completedIdeas = this.ideas.filter(
      (idea) => idea.status === "Completed" || idea.status === "Released" || idea.status === "Implemented",
    ).length

    return this.ideas.length > 0 ? Math.round((completedIdeas / this.ideas.length) * 100) : 0
  }

  showToast(title, message, variant) {
    this.dispatchEvent(
      new ShowToastEvent({
        title: title,
        message: message,
        variant: variant,
      }),
    )
  }

  // Helper method to get comment class based on isStaff
  getCommentClass(isStaff) {
    return isStaff ? "slds-box slds-box_xx-small slds-theme_shade" : "slds-box slds-box_xx-small slds-theme_default"
  }

  // Helper method to get status class
  getStatusClass(status) {
    if (status === "New") {
      return "status-new"
    } else if (status === "Backlog") {
      return "status-backlog"
    } else if (status === "In Progress") {
      return "status-in-progress"
    } else if (status === "Scheduled") {
      return "status-scheduled"
    } else {
      return "status-default"
    }
  }

  // Getters for computed values
  get isPrevDisabled() {
    return this.currentPage <= 1
  }

  get isNextDisabled() {
    return this.currentPage >= this.totalPages
  }

  get paginationText() {
    return `${this.currentPage} of ${this.totalPages}`
  }

  get newIdeasCount() {
    return this.ideas.filter((idea) => idea.status === "New").length
  }

  get inProgressIdeasCount() {
    return this.ideas.filter((idea) => idea.status === "In Progress").length
  }

  get completedIdeasCount() {
    return this.ideas.filter((idea) => idea.status === "Completed").length
  }

  get highPriorityIdeasCount() {
    return this.ideas.filter((idea) => idea.priority === "high").length
  }

  get totalCommentsCount() {
    return this.ideas.reduce((total, idea) => total + idea.commentCount, 0)
  }

  get pendingResponseCount() {
    return this.ideas.filter((idea) => idea.status === "New" || idea.status === "Under Review").length
  }

  get hasSelectedIdea() {
    return this.selectedIdea !== null
  }

  get hasSelectedIdeaComments() {
    return this.selectedIdea && this.selectedIdea.comments && this.selectedIdea.comments.length > 0
  }

  get hasFilteredIdeas() {
    return this.filteredIdeas && this.filteredIdeas.length > 0
  }

  get detailModalClass() {
    return this.isDetailModalOpen ? "slds-modal slds-fade-in-open slds-modal_medium" : "slds-modal"
  }

  get responseModalClass() {
    return this.isResponseModalOpen ? "slds-modal slds-fade-in-open slds-modal_medium" : "slds-modal"
  }

  get disableResponseButton() {
    return !this.responseText.trim()
  }

  // Update the assignedCount and unassignedCount getters to use the same logic
  get assignedCount() {
    return this.ideas.filter((idea) => idea.assignedTo && idea.assignedTo.trim() !== "").length
  }

  get unassignedCount() {
    return this.ideas.filter((idea) => !idea.assignedTo || idea.assignedTo.trim() === "").length
  }

  // Update the myWorkCount getter to use the same logic
  get myWorkCount() {
    // Find the current user's name
    const currentUser = this.userOptions.find((user) => user.value === this.currentUserId)
    const currentUserName = currentUser ? currentUser.label : null

    // Count ideas assigned to the current user by exact name match
    return this.ideas.filter(
      (idea) => idea.assignedTo && currentUserName && idea.assignedTo.trim() === currentUserName.trim(),
    ).length
  }

  // Add a getter for combobox class
  get comboboxClass() {
    return this.isUserSearchOpen
      ? "slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click slds-is-open"
      : "slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click"
  }



  
  calculateStatistics() {
    // Calculate total ideas
    const totalIdeas = this.ideas.length;

    // Calculate pending response (e.g. status = New or Under Review)
    const pendingResponse = this.ideas.filter(
      idea => idea.status === 'New'
    ).length;

    // Calculate how many are "implemented" or "completed"
    const implementedIdeas = this.ideas.filter(
      idea => idea.status === 'Completed/Archived/Released'
    ).length;

    // Calculate implementation rate as a percentage
    const implementationRate = totalIdeas > 0
      ? Math.round((implementedIdeas / totalIdeas) * 100)
      : 0;

    // Calculate pending response rate as a percentage
    const pendingResponseRate = totalIdeas > 0
      ? Math.round((pendingResponse / totalIdeas) * 100)
      : 0;
      
    // Calculate response completion rate (inverse of pending response rate)
    const responseCompletionRate = 100 - pendingResponseRate;

    // Update the reactive statsData object
    this.statsData = {
      totalIdeas,
      pendingResponse,
      implementationRate,
      // You can dynamically compute "trend" or keep them placeholders
      totalTrend: '+12% from last month',
      pendingTrend: '-3% from last week',
      implementationTrend: '+5% from last quarter',
      // CSS width properties for visualization
      totalIdeasWidth: 'width: 100%',
      pendingResponseWidth: `width: ${responseCompletionRate}%`,
      implementationRateWidth: `width: ${implementationRate}%`
    };
  }
}