public with sharing class VBUFeedbackController {
    @AuraEnabled
    public static void submitFeedback(VBU_Feedback__c feedback) {
        insert feedback;
    }
}