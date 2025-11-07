import { LightningElement, api, wire, track } from "lwc"
import getCollectionData from "@salesforce/apex/KnowledgeArticleViewerController.getCollectionData"
import getArticle from "@salesforce/apex/KnowledgeArticleViewerController.getArticle"
import getRoles from "@salesforce/apex/KnowledgeArticleViewerController.getRoles"

import { CurrentPageReference } from "lightning/navigation"
import { NavigationMixin } from "lightning/navigation"

export default class KnowledgeArticleViewer extends NavigationMixin(LightningElement) {
  // Data properties
  collections = []
  loading = true
  filterLoading = false // New property to track filter loading state
  error = ""
  contentVersionId = "068WE000005j7orYAA"

  // URL parameter
  urlName = ""
  roleParam = ""

  // Page reference for navigation
  @track pageReference

  // API properties
  @api activeArticleId
  @api activeCollectionName
  @api activeCollectionId
  @api recordId

  // PDF height in rem (if media is PDF)
  @api heightInRem = "40"

  // Role filter properties
  @track selectedRole = "--" // Default to "none" (represented as --)
  @track availableRoles = []
  @track isRoleFilterOpen = false
  @track originalCollections = [] // Store original collections before filtering
  @track roleFilterActive = false
  @track filteredCollections = [] // Store filtered collections separately

  // Capture the URL parameters using wire
  @wire(CurrentPageReference)
  getStateParameters(currentPageReference) {
    if (currentPageReference) {
      // Store the current page reference for back navigation
      this.pageReference = currentPageReference

      this.urlName = currentPageReference.attributes.urlName || ""

      // Get role parameter from state
      if (currentPageReference.state && currentPageReference.state.role) {
        this.roleParam = currentPageReference.state.role
        this.selectedRole = this.roleParam
        this.roleFilterActive = this.roleParam !== "--"
      }

      console.log("CurrentPageReference:", currentPageReference)
      console.log("URL Param (urlName):", this.urlName)
      console.log("Role Param:", this.roleParam)
    }
  }

  connectedCallback() {
    this.loadCollectionData()
    this.loadRoles()
  }

  // Handle back button click
  handleBackButton() {
    // Use browser history to go back
    window.history.back()
  }

  async loadRoles() {
    try {
      // Call Apex method to get roles
      const roles = await getRoles()

      // Add "none" option as first in the list
      this.availableRoles = [
        { label: "-- None --", value: "--" },
        ...roles.map((role) => ({
          label: role,
          value: role,
        })),
      ]

      // If role param exists, set it as selected role
      if (this.roleParam) {
        this.selectedRole = this.roleParam
        this.roleFilterActive = this.roleParam !== "--"
      } else {
        this.selectedRole = "--" // Default to "none"
      }
    } catch (error) {
      console.error("Error loading roles:", error)
      this.error = "Error loading roles: " + error.message
    }
  }

  // Update the loadCollectionData method to handle the new data structure
  async loadCollectionData() {
    try {
      const data = await getCollectionData()

      // Store original collections for role filtering
      this.originalCollections = JSON.parse(JSON.stringify(data))
      let collections = data

      // Scenario 1: If urlName is present
      if (this.urlName) {
        const result = await getArticle({ UrlName: this.urlName })
        if (!result) {
          this.error = "No article found for the provided URL."
          this.loading = false
          return
        }
        // unify the returned Apex article
        const foundArticle = { ...result, id: result.Id }

        this.activeArticleId = foundArticle.id

        // First filter collections to only include those matching the article's Collection__c
        collections = collections.filter((c) => c.name === foundArticle.Collection__c)

        // Then expand the subcategory containing the article
        collections = collections.map((c) => {
          const updatedSubcats = c.subcategories.map((sub) => {
            const hasMatch = sub.articles.some((art) => art.id === foundArticle.id)
            return {
              ...sub,
              isExpanded: hasMatch ? true : sub.isExpanded,
            }
          })
          return { ...c, subcategories: updatedSubcats }
        })
        this.activeArticle = foundArticle

        // If we have a role parameter, use it; otherwise, don't set a role filter based on the article
        if (this.roleParam && this.roleParam !== "--") {
          this.selectedRole = this.roleParam
          this.roleFilterActive = true
        }
      }
      // Scenario 1b: If no urlName but recordId is present
      else if (this.recordId) {
        const result = await getArticle({ recordId: this.recordId })
        if (!result) {
          this.error = "No article found for the provided Record ID."
          this.loading = false
          return
        }
        // unify the returned Apex article
        const foundArticle = { ...result, id: result.Id }

        this.activeArticleId = foundArticle.id

        // First filter collections to only include those matching the article's Collection__c
        collections = collections.filter((c) => c.name === foundArticle.Collection__c)

        // Then expand the subcategory containing the article
        collections = collections.map((c) => {
          const updatedSubcats = c.subcategories.map((sub) => {
            const hasMatch = sub.articles.some((art) => art.id === foundArticle.id)
            return {
              ...sub,
              isExpanded: hasMatch ? true : sub.isExpanded,
            }
          })
          return { ...c, subcategories: updatedSubcats }
        })
        this.activeArticle = foundArticle

        // If we have a role parameter, use it; otherwise, don't set a role filter based on the article
        if (this.roleParam && this.roleParam !== "--") {
          this.selectedRole = this.roleParam
          this.roleFilterActive = true
        }
      }
      // Scenario 2: No urlName but activeCollectionName is given
      else if (this.activeCollectionName) {
        // Filter to that one collection name
        collections = collections.filter((c) => c.name === this.activeCollectionName)
        // Expand all subcats in that collection
        collections = collections.map((c) => ({
          ...c,
          subcategories: c.subcategories.map((subcat) => ({
            ...subcat,
            isExpanded: true,
          })),
        }))
      }

      // Apply role filter if we have a role parameter
      if (this.roleParam && this.roleParam !== "--") {
        collections = this.applyRoleFilterToCollections(collections)
      }

      this.collections = collections
      this.filteredCollections = collections // Initialize filteredCollections
      this.loading = false

      // Add console logging to debug
      console.log("Collections loaded:", JSON.stringify(this.collections))
    } catch (err) {
      console.error("Error loading collections:", err)
      this.error = err.message
      this.loading = false
    }
  }

  // Toggle role filter dropdown
  toggleRoleFilter() {
    this.isRoleFilterOpen = !this.isRoleFilterOpen
  }

  // Close role filter dropdown when clicking outside
  closeRoleFilter() {
    this.isRoleFilterOpen = false
  }

  // Add a method to stop event propagation
  stopPropagation(event) {
    event.stopPropagation()
  }

  // Apply role filter to collections
  applyRoleFilterToCollections(collectionsToFilter) {
    if (this.selectedRole === "--") {
      // If "none" is selected, return all collections unfiltered
      return collectionsToFilter
    }

    // First, filter articles by role across ALL collections
    let filteredCollections = collectionsToFilter.map((collection) => {
      return {
        ...collection,
        subcategories: collection.subcategories.map((subcat) => {
          const filteredArticles = subcat.articles.filter((article) => {
            // Check if the article has the selected role
            // Note: article.roles should be an array of roles
            return article.roles && Array.isArray(article.roles)
              ? article.roles.includes(this.selectedRole)
              : article.role === this.selectedRole // Fallback for backward compatibility
          })
          return {
            ...subcat,
            articles: filteredArticles,
          }
        }),
      }
    })

    // Then, remove subcategories with no articles
    filteredCollections = filteredCollections.map((collection) => {
      return {
        ...collection,
        subcategories: collection.subcategories.filter((subcat) => subcat.articles.length > 0),
      }
    })

    // Finally, remove collections with no subcategories
    filteredCollections = filteredCollections.filter((collection) => collection.subcategories.length > 0)

    return filteredCollections
  }

  // Update the applyRoleFilter method to properly handle the Role__c field
  applyRoleFilter() {
    console.log("Applying role filter:", this.selectedRole)

    // Set filter loading state to true
    this.filterLoading = true

    // Set role filter active flag
    this.roleFilterActive = this.selectedRole !== "--"

    // Close the filter dropdown
    this.isRoleFilterOpen = false

    // Use setTimeout to allow the UI to update with the loading state
    // before we start the filtering process
    setTimeout(() => {
      // Start with the original collections to ensure we have all articles
      let newFilteredCollections = JSON.parse(JSON.stringify(this.originalCollections))

      // Apply the filter
      if (this.selectedRole !== "--") {
        newFilteredCollections = this.applyRoleFilterToCollections(newFilteredCollections)
      }

      // Update filtered collections
      this.filteredCollections = newFilteredCollections

      // Update collections with filtered data
      this.collections = newFilteredCollections

      // Turn off loading state
      this.filterLoading = false

      // Navigate to the same page with role parameter
      this[NavigationMixin.Navigate]({
        type: "standard__webPage",
        attributes: {
          url: this.addRoleToCurrentUrl(this.selectedRole),
        },
      })
    }, 0)
  }

  // Add role parameter to current URL
  addRoleToCurrentUrl(role) {
    const url = new URL(window.location.href)
    url.searchParams.set("role", role)
    return url.toString()
  }

  // Handle role selection change
  handleRoleChange(event) {
    this.selectedRole = event.detail.value
  }

  // Expand/collapse
  handleCategoryToggle(event) {
    const collId = event.currentTarget.dataset.collectionId
    const catId = event.currentTarget.dataset.categoryId
    this.collections = this.collections.map((collection) => {
      if (collection.id === collId) {
        return {
          ...collection,
          subcategories: collection.subcategories.map((subcat) =>
            subcat.id === catId ? { ...subcat, isExpanded: !subcat.isExpanded } : subcat,
          ),
        }
      }
      return collection
    })
  }

  // Handle radio selection (navigate to article record)
  handleArticleSelection(event) {
    const selectedId = event.target.value
    if (!selectedId) {
      return
    }
    this.activeArticleId = selectedId

    // Navigate to the record page with the role parameter
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: selectedId,
        objectApiName: "Knowledge__kav",
        actionName: "view",
      },
      state: {
        role: this.selectedRole, // Pass the role as a parameter
      },
    })
  }

  // Memoization for computed properties
  _memoizedCollections
  _lastCollections
  _lastActiveArticleId

  get collectionsWithComputedProperties() {
    const changedCollections =
      !this._lastCollections || JSON.stringify(this._lastCollections) !== JSON.stringify(this.collections)
    const changedActiveArticle = this._lastActiveArticleId !== this.activeArticleId

    if (!changedCollections && !changedActiveArticle) {
      return this._memoizedCollections
    }

    this._lastCollections = JSON.parse(JSON.stringify(this.collections))
    this._lastActiveArticleId = this.activeArticleId

    this._memoizedCollections = this.collections.map((collection) => ({
      ...collection,
      iconName: this.getCollectionIcon(collection.name),
      subcategories: collection.subcategories.map((subcat) => ({
        ...subcat,
        expandIconName: subcat.isExpanded ? "utility:chevrondown" : "utility:chevronright",
        articlesListClass: subcat.isExpanded ? "articles-list expanded" : "articles-list",
        articles: subcat.articles.map((article) => ({
          ...article,
          // Mark selected if it matches activeArticleId
          isSelected: this.activeArticleId === article.id,
        })),
      })),
    }))

    return this._memoizedCollections
  }

  getCollectionIcon(name) {
    const iconMap = {
      Pathology: "utility:microscope",
      Voicebrook: "utility:company",
      "VoiceOver PRO": "utility:voice",
      "All About Your Role": "utility:user",
    }
    return iconMap[name] || "utility:knowledge_base"
  }

  // -------------------------
  // Active article
  _activeArticle
  get activeArticle() {
    // if we have a cached article that matches the ID, return it
    if (this._activeArticle && this._activeArticle.id === this.activeArticleId) {
      return this._activeArticle
    }

    return null
  }
  set activeArticle(value) {
    this._activeArticle = value
  }

  // -------------------------
  // Media Computed Properties
  get showMedia() {
    return this.activeArticle && this.activeArticle.Media_Type__c
  }
  get isPdf() {
    return this.showMedia && this.activeArticle.Media_Type__c === "PDF"
  }
  get isVideo() {
    return this.showMedia && this.activeArticle.Media_Type__c === "Video"
  }
  // Use renditionDownload + inline
  get pdfUrl() {
    if (!this.activeArticle?.Media_Id__c) {
      return ""
    }
    // Get the base URL dynamically from the current org
    const baseUrl = window.location.origin
    return `${baseUrl}/sfc/servlet.shepherd/version/download/${this.activeArticle.Media_Id__c}`
  }
  get vidyardUrl() {
    return this.activeArticle ? `https://play.vidyard.com/${this.activeArticle.Media_Id__c}` : ""
  }

  get pdfHeight() {
    return this.heightInRem + "rem"
  }
  get iframeStyle() {
    return `height: ${this.pdfHeight}; width: 100%;`
  }

  // Show role filter for All About Your Role collection
  get showRoleFilter() {
    // only return true if the collection is "All About Your Role"
    const isAllAboutYourRole = this.collections.some((collection) => collection.name === "All About Your Role")
    return isAllAboutYourRole && this.collections.length > 0
  }

  // Get the button variant based on whether filter is active
  get roleFilterButtonVariant() {
    return this.roleFilterActive ? "brand" : "neutral"
  }

  // Get the filter button label
  get roleFilterButtonLabel() {
    return this.roleFilterActive ? `Filtered by: ${this.selectedRole}` : "Filter by Role"
  }
}