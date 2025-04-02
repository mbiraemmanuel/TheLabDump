import { LightningElement, api, wire, track } from "lwc"
import getCollectionData from "@salesforce/apex/VBU_KnowledgeController.getCollectionData"
import getArticle from "@salesforce/apex/VBU_KnowledgeController.getArticle"
import getRoles from "@salesforce/apex/VBU_KnowledgeController.getRoles"

import { CurrentPageReference } from "lightning/navigation"
import { NavigationMixin } from "lightning/navigation"

export default class KnowledgeArticleViewer extends NavigationMixin(LightningElement) {
  // Data properties
  collections = []
  loading = true
  error = ""
  // @track pdfUrl;
  contentVersionId = "068WE000005j7orYAA"

  // URL parameter
  urlName = ""

  // API properties
  @api activeArticleId
  @api activeCollectionName
  @api activeCollectionId

  @api recordId

  // PDF height in rem (if media is PDF)
  @api heightInRem = "40"

  // Role filter properties
  @track selectedRole = ""
  @track availableRoles = []
  @track isRoleFilterOpen = false
  @track originalCollections = [] // Store original collections before filtering

  // Capture the URL parameter using wire
  @wire(CurrentPageReference)
  getStateParameters(currentPageReference) {
    if (currentPageReference) {
      this.urlName = currentPageReference.attributes.urlName || ""
      console.log("CurrentPageReference:", currentPageReference)
      console.log("URL Param (urlName):", this.urlName)
    }
  }

  connectedCallback() {
    this.loadCollectionData()
    this.loadRoles()
  }

  async loadRoles() {
    try {
      // Call Apex method to get roles
      const roles = await getRoles()
      this.availableRoles = roles.map((role) => ({
        label: role,
        value: role,
      }))

      // Set default selected role to the first one if available
      if (this.availableRoles.length > 0) {
        this.selectedRole = this.availableRoles[0].value
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

        // If this is a "Your Role" collection, set the selected role based on the article
        if (foundArticle.Collection__c === "All About Your Role" && foundArticle.Role__c) {
          this.selectedRole = foundArticle.Role__c
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

        // If this is a "Your Role" collection, set the selected role based on the article
        if (foundArticle.Collection__c === "All About Your Role" && foundArticle.Role__c) {
          this.selectedRole = foundArticle.Role__c
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

      this.collections = collections
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

  // Update the applyRoleFilter method to properly handle the Role__c field
  applyRoleFilter() {
    if (!this.selectedRole) return

    console.log("Applying role filter:", this.selectedRole)
    console.log("Original collections:", JSON.stringify(this.originalCollections))

    // Start with the original collections to ensure we have all articles
    let filteredCollections = JSON.parse(JSON.stringify(this.originalCollections))

    // Filter only the "All About Your Role" collection articles
    filteredCollections = filteredCollections.map((collection) => {
      if (collection.name === "All About Your Role") {
        console.log("Found All About Your Role collection")
        return {
          ...collection,
          subcategories: collection.subcategories.map((subcat) => {
            console.log("Subcategory:", subcat.name, "Articles before filter:", subcat.articles.length)
            const filteredArticles = subcat.articles.filter((article) => {
              console.log("Article:", article.title, "Role:", article.role)
              return article.role === this.selectedRole
            })
            console.log("Articles after filter:", filteredArticles.length)
            return {
              ...subcat,
              articles: filteredArticles,
            }
          }),
        }
      }
      return collection
    })

    console.log("Filtered collections:", JSON.stringify(filteredCollections))

    // Update collections with filtered data
    this.collections = filteredCollections

    // Close the filter dropdown
    this.isRoleFilterOpen = false
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
    // Optionally use NavigationMixin to open the record
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: selectedId,
        objectApiName: "Knowledge__kav",
        actionName: "view",
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
    return (
      "https://voicebrook--rafiki.sandbox.file.force.com/sfc/servlet.shepherd/version/download/" +
      this.activeArticle.Media_Id__c
    )
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


  get showRoleFilter() {
    return this.collections.some((collection) => collection.name === "All About Your Role") && this.activeCollectionName !== "All About Your Role"
  }
}

