({
    doInit: function(component, event, helper) {
        // Any initialization logic if needed
    },
    
    handleSubmit: function(component, event, helper) {
        var generalFeedback = component.get("v.generalFeedback");
        var improvementSuggestions = component.get("v.improvementSuggestions");
        
        // Validate form fields
        if (!generalFeedback || !improvementSuggestions) {
            helper.showToast("error", "Please fill in all required fields.");
            return;
        }
        
        // Set submitting state
        component.set("v.isSubmitting", true);
        
        // Call helper to save feedback
        helper.saveFeedback(component);
    }
})
