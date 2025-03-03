import { LightningElement, api, wire, track } from 'lwc';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import NavigationIcons from '@salesforce/resourceUrl/CommunityNavigation';
import getNavigationMenuItems from '@salesforce/apex/NavigationMenuItemsController.getNavigationMenuItems';
import isGuestUser from '@salesforce/user/isGuest';
import USER_ID from '@salesforce/user/Id';
import basePath from '@salesforce/community/basePath';

// Import the Profile Name field
import PROFILE_NAME_FIELD from '@salesforce/schema/User.Profile.Name';

export default class CommunityTileMenu extends NavigationMixin(LightningElement) {
    @api menuName;
    @api buttonLabel;
    @api buttonRedirectPageAPIName;

    // Track the user profile name
    @track profileName;

    // Store raw menu items from Apex
    @track rawMenuItems = [];
    @track error;

    // Other properties
    href = basePath;
    isLoaded = false;
    publishedState;
    hasLoadedItems = false; // Flag to ensure loadMenuItems is called only once

    // Wire to retrieve the User record including the Profile Name
    @wire(getRecord, { 
        recordId: USER_ID, 
        fields: [PROFILE_NAME_FIELD] 
    })
    wiredUser({ error, data }) {
        if (data) {
            this.profileName = getFieldValue(data, PROFILE_NAME_FIELD);
        } else if (error) {
            console.error('Error retrieving profile name', error);
        }
    }

    // Wire to get the current page reference to set the publishedState
    @wire(CurrentPageReference)
    setCurrentPageReference(currentPageReference) {
        const app = currentPageReference?.state?.app;
        this.publishedState = (app === 'commeditor') ? 'Draft' : 'Live';
    }

    // Use renderedCallback to check if we have the required information and call loadMenuItems only once.
    renderedCallback() {
        if (!this.hasLoadedItems && this.publishedState && this.menuName) {
            this.hasLoadedItems = true;
            this.loadMenuItems();
        }
    }

    // Imperative Apex call to retrieve menu items, now that we have the publishedState.
    loadMenuItems() {
        getNavigationMenuItems({ 
            menuName: this.menuName, 
            publishedState: this.publishedState 
        })
            .then(data => {
                // Map through the raw items to add extra properties (and adjust labels)
                this.rawMenuItems = data.map((item, index) => {
                    let labelForDisplay = item.Label === 'FAQ'
                        ? 'Frequently Asked Questions'
                        : item.Label;
                    return {
                        id: index,
                        label: labelForDisplay,
                        icon: NavigationIcons + '/Images/' + this.refineLabel(item.Label) + '.png',
                        target: item.Target,
                        defaultListViewId: item.DefaultListViewId,
                        type: item.Type,
                        accessRestriction: item.AccessRestriction
                    };
                });
                this.error = undefined;
                this.isLoaded = true;
            })
            .catch(error => {
                this.error = error;
                this.rawMenuItems = [];
                this.isLoaded = true;
                console.error(`Navigation menu error: ${JSON.stringify(this.error)}`);
            });
    }

    // Getter to filter the raw menu items based on the profile name and guest status.
    get menuItems() {
        return this.rawMenuItems.filter(item => {
            // Check access restriction: allow if none or if login required and the user is not a guest.
            const passAccessRestriction =
                item.accessRestriction === 'None' ||
                (item.accessRestriction === 'LoginRequired' && !isGuestUser);
            // For "Account Reports", include only if the profile name includes "Admin".
            const passAdminCheck =
                item.label !== 'Account Reports' ||
                (this.profileName && this.profileName.includes('Admin'));
            return passAccessRestriction && passAdminCheck;
        });
    }

    handleClick(event) {
        // Identify the menu item based on its index (data-id attribute)
        const menuItem = this.menuItems[event.currentTarget.dataset.id];
        if (!menuItem) {
            return;
        }

        const { type, target, defaultListViewId } = menuItem;
        let pageReference;

        if (type === 'SalesforceObject') {
            pageReference = {
                type: 'standard__objectPage',
                attributes: { objectApiName: target },
                state: { filterName: defaultListViewId }
            };
        } else if (type === 'InternalLink') {
            pageReference = {
                type: 'standard__webPage',
                attributes: { url: basePath + target }
            };
        } else if (type === 'ExternalLink') {
            pageReference = {
                type: 'standard__webPage',
                attributes: { url: target }
            };
        } else if (type === 'HomePage') {
            pageReference = {
                type: 'comm__namedPage',
                attributes: { name: 'Home' }
            };
        } else {
            console.log(`Navigation menu type "${type}" not implemented for item ${JSON.stringify(menuItem)}`);
        }

        if (pageReference) {
            event.preventDefault();
            this[NavigationMixin.Navigate](pageReference);
        }
    }

    // Helper method to refine label strings for icon file names.
    refineLabel(label) {
        return label.trim().replace(/[\s/]+/g, '');
    }
}