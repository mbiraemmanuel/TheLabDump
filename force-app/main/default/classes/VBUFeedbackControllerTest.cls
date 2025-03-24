@isTest
private class VBUFeedbackControllerTest {
    static testMethod void testSubmitFeedback() {
        // Create a dummy feedback record.
        // Adjust the field names based on your VBU_Feedback__c object requirements.
        VBU_Feedback__c feedback = new VBU_Feedback__c(
            Improvement_Suggestions__c = 'This is a test feedback',
            General_Feedback__c = 'TEST'
        );
        
        Test.startTest();
        VBUFeedbackController.submitFeedback(feedback);
        Test.stopTest();
        
        // Verify the feedback record was inserted.
        VBU_Feedback__c insertedFeedback = [
            SELECT Id, Improvement_Suggestions__c 
            FROM VBU_Feedback__c 
            WHERE Id = :feedback.Id
            LIMIT 1
        ];
        System.assertEquals('This is a test feedback', insertedFeedback.Improvement_Suggestions__c, 'Feedback record should have the correct comments');
    }
}
