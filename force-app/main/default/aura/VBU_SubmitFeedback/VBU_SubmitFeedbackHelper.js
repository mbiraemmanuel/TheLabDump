({
    saveFeedback: function(component) {
        var action = component.get("c.submitFeedback");
        var feedback = {
            'sobjectType': 'VBU_Feedback__c',
            'General_Feedback__c': component.get("v.generalFeedback"),
            'Improvement_Suggestions__c': component.get("v.improvementSuggestions")
        };
        
        action.setParams({
            feedback: feedback
        });
        
        action.setCallback(this, function(response) {
            var state = response.getState();
            if (state === "SUCCESS") {
                // Reset form fields
                component.set("v.generalFeedback", "");
                component.set("v.improvementSuggestions", "");
                
                // Show success toast at the top using force:showToast
                this.showToast("success", "Feedback submitted successfully!");
            } else {
                this.showToast("error", "Error submitting feedback. Please try again.");
            }
            component.set("v.isSubmitting", false);
        });
        
        $A.enqueueAction(action);
    },
    
    showToast: function(type, message) {
        var toastEvent = $A.get("e.force:showToast");
        toastEvent.setParams({
            type: type,
            message: message,
            mode: "dismissible"
        });
        toastEvent.fire();
    }
})
