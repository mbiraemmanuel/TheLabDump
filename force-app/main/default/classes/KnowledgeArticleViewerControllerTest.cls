@isTest(SeeAllData=true)
private class KnowledgeArticleViewerControllerTest {

    
    @isTest
    static void testGetRoles() {
        Test.startTest();
        List<String> roles = KnowledgeArticleViewerController.getRoles();
        Test.stopTest();
        
        System.assertNotEquals(null, roles, 'Roles list should not be null');
        if (!roles.isEmpty()) {
            System.assert(roles.contains('Client Support Specialist'), 'Roles list should contain "Client Support Specialist"');
        }
        
    }
    
    @isTest
    static void testGetCollectionData() {
        Test.startTest();
        List<KnowledgeArticleViewerController.CollectionWrapper> collections = 
            KnowledgeArticleViewerController.getCollectionData();
        Test.stopTest();
        
        System.assertNotEquals(null, collections, 'Collections should not be null');
    }
    
    @isTest
    static void testGetArticleByUrlName() {
        Test.startTest();
        Knowledge__kav resultArticle = 
            KnowledgeArticleViewerController.getArticle('test-article', null);
        Test.stopTest();
        
    }
    
    @isTest
    static void testGetArticleByRecordId() {
        // Retrieve the test article using its UrlName
        Knowledge__kav testArticle = [
            SELECT Id, Title 
            FROM Knowledge__kav 
            WHERE UrlName = 'test-article'
            LIMIT 1
        ];
        
        Test.startTest();
        Knowledge__kav resultArticle = 
            KnowledgeArticleViewerController.getArticle(null, testArticle.Id);
        Test.stopTest();
        
        if (resultArticle != null) {
            System.assertEquals(testArticle.Id, resultArticle.Id, 'Returned article Id should match the test article Id');
        }
    }
}
