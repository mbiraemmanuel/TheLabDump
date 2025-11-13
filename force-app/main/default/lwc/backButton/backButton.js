import { LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class BackButton extends NavigationMixin(LightningElement) {
    
    handleBackClick() {
        // Use browser history to go back
        // This works in Experience Sites and standard Salesforce
        if (window.history.length > 1) {
            window.history.back();
        } else {
            // Fallback: Navigate to home page if no history exists
            this[NavigationMixin.Navigate]({
                type: 'standard__namedPage',
                attributes: {
                    pageName: 'home'
                }
            });
        }
    }
}
