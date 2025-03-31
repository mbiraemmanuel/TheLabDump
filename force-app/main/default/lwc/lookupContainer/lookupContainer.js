import { LightningElement, api, track, wire } from "lwc"
import getUsers from "@salesforce/apex/IdeasController.getUsers"

export default class LookupContainer extends LightningElement {
  @api label = "Assigned To"
  @api placeholder = "Search users..."
  @api required = false
  @api selectedUserId
  @api disabled = false

  @track isLoading = false
  @track searchResults = []
  @track selection = []

  @wire(getUsers)
  wiredUsers({ error, data }) {
    if (data) {
      // Store the data for later use
      this.allUsers = data

      // If we have a selectedUserId, set the initial selection
      if (this.selectedUserId) {
        const selectedUser = data.find((user) => user.Id === this.selectedUserId)
        if (selectedUser) {
          this.selection = [
            {
              id: selectedUser.Id,
              title: selectedUser.Name,
              subtitle: selectedUser.Department || "Not Specified",
              avatarSrc: selectedUser.SmallPhotoUrl,
            },
          ]

          // Set the selection in the lookup component
          const lookupEl = this.template.querySelector("c-lookup")
          if (lookupEl) {
            lookupEl.setSelection(this.selection[0])
          }
        }
      }
    } else if (error) {
      console.error("Error loading users", error)
    }
  }

  handleSearch(event) {
    const searchTerm = event.detail.searchTerm

    // Don't search if we don't have users loaded yet
    if (!this.allUsers) {
      return
    }

    this.isLoading = true

    // Filter users based on search term
    const results = this.allUsers
      .filter(
        (user) =>
          user.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.Department && user.Department.toLowerCase().includes(searchTerm.toLowerCase())),
      )
      .map((user) => ({
        id: user.Id,
        title: user.Name,
        subtitle: user.Department || "Not Specified",
        avatarSrc: user.SmallPhotoUrl,
      }))

    this.searchResults = results
    this.isLoading = false

    // Update the lookup with search results
    const lookupEl = this.template.querySelector("c-lookup")
    if (lookupEl) {
      lookupEl.setSearchResults(results)
    }
  }

  handleSelectionChange(event) {
    const selection = event.detail
    this.selection = selection ? [selection] : []

    // Notify parent component of selection change
    this.dispatchEvent(
      new CustomEvent("selectionchange", {
        detail: {
          selectedId: selection ? selection.id : null,
        },
      }),
    )
  }

  @api
  getSelection() {
    return this.selection.length > 0 ? this.selection[0] : null
  }

  @api
  setSelection(userId) {
    if (!this.allUsers) {
      // Store the ID for when users are loaded
      this.selectedUserId = userId
      return
    }

    const selectedUser = this.allUsers.find((user) => user.Id === userId)
    if (selectedUser) {
      const selection = {
        id: selectedUser.Id,
        title: selectedUser.Name,
        subtitle: selectedUser.Department || "Not Specified",
        avatarSrc: selectedUser.SmallPhotoUrl,
      }

      this.selection = [selection]

      // Set the selection in the lookup component
      const lookupEl = this.template.querySelector("c-lookup")
      if (lookupEl) {
        lookupEl.setSelection(selection)
      }
    }
  }

  @api
  clearSelection() {
    this.selection = []
    const lookupEl = this.template.querySelector("c-lookup")
    if (lookupEl) {
      lookupEl.clear()
    }
  }
}

