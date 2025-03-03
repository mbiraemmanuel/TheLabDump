({
    
    handleSubmit: function(component, event, helper) {
        console.log("Submitted");
        
        /*event.preventDefault(); // Prevent default submit
        var fields = event.getParam('fields');
        fields.Subject = component.get("v.subject");
        fields.Description = component.get("v.description");
        fields.RecordTypeId = '01280000000UGwNAAW';
        fields.Origin = 'Community Case';
        fields.OwnerId = '01280000000UGwNAAW';
        component.find('recordEditForm').submit(fields); // Submit form with fields
        console.log("Submitted");*/
        var subject = component.get("v.subject");
        var description = component.get("v.description");

        if (!subject || !description) {
            var toastEvent = $A.get("e.force:showToast");
            toastEvent.setParams({
                "mode": 'dismissible',
                "title": "Error",
                "message": "Please fill in all required fields."
            });
            toastEvent.fire();
            return;
        }

        // Prepare flow input variables
        var flowInputs = [
            { name: "subject", type: "String", value: subject },
            { name: "description", type: "String", value: description }
        ];

        component.set("v.flowInputs", flowInputs);

        var flow = component.find("caseFlow");
        flow.startFlow(component.get("v.flowName"), component.get("v.flowInputs"));
    },
    
    handleSuccess: function(component, event, helper) {
        console.log("Succcess");
        var payload = event.getParam("response");
        var toastEvent = $A.get("e.force:showToast");
        toastEvent.setParams({
        	"mode": 'sticky',
            "title": "Success!",
            "message": "Your Idea has been successfuly submitted. Our Client Engagement team will contact you if we need more information and will follow-up oncce a decision has been made on your proposal."
        });
        toastEvent.fire();
    },
    handleError: function(component, event, helper) {
        console.log("Error");
        var errors = event.getParam("errors");
        
        var toastEvent = $A.get("e.force:showToast");
        toastEvent.setParams({
        	"mode": 'dismissible',
            "title": "Error submitting your idea!",
            "message": "Please try submitting your idea again. If it fails, don't hesitate to contact our support team for assistance."
        });
        toastEvent.fire();
    },
    
    handleStatusChange: function(component, event, helper) {
        event.preventDefault();
        console.log('Done');
        console.log(event.getParam('status'))
        if (event.getParam('status') === "FINISHED_SCREEN") {
            component.set("v.flowFinished", true);
            var toastEvent = $A.get("e.force:showToast");
            
            // Reset the field values
            component.set("v.subject", "");
            component.set("v.description", "");
            
            toastEvent.setParams({
                "mode": 'sticky',
                "type" : "success",
                "title": "Success!",
                "message": "Your Idea has been successfully submitted. Our Client Engagement team will contact you if we need more information and will follow-up once a decision has been made on your proposal."
            });
            toastEvent.fire();
        }
        
    }
})