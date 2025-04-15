public with sharing class KnowledgeArticleViewerController {
    /**
     * Get available roles for filtering articles
     * @return List<String> List of available roles
     */
    @AuraEnabled(cacheable=true)
    public static List<String> getRoles() {
        try {
            // Query distinct roles from Knowledge articles
            Set<String> roleSet = new Set<String>();
        
            // Query articles with 'All About Your Role' collection and get unique roles
            for(Knowledge__kav article : [
                SELECT Role__c 
                FROM Knowledge__kav 
                WHERE Collection__c = 'All About Your Role' 
                AND PublishStatus = 'Online'
            ]) {
                if(String.isNotBlank(article.Role__c)) {
                    roleSet.add(article.Role__c);
                }
            }
        
            // Convert set to list and sort
            List<String> roles = new List<String>(roleSet);
            roles.sort();
        
            return roles;
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving roles: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<CollectionWrapper> getCollectionData() {
        try {
            // Query for Knowledge Articles
            List<Knowledge__kav> articles = [
                SELECT Id, Title, UrlName, Summary, Collection__c, Collection_Category__c,
                Article__c, Role__c
                FROM Knowledge__kav 
                WHERE PublishStatus = 'Online' 
                AND Language = 'en_US'
                ORDER BY Collection__c, Collection_Category__c, Title
            ];

            // Group articles by Collection and Collection Category
            Map<String, Map<String, List<ArticleWrapper>>> collectionMap = new Map<String, Map<String, List<ArticleWrapper>>>();
        
            for(Knowledge__kav article : articles) {
                String collection = article.Collection__c;
                String category = article.Collection_Category__c;
            
                if(String.isBlank(collection)) continue;
                if(String.isBlank(category)) category = 'General';
            
                if(!collectionMap.containsKey(collection)) {
                    collectionMap.put(collection, new Map<String, List<ArticleWrapper>>());
                }
                if(!collectionMap.get(collection).containsKey(category)) {
                    collectionMap.get(collection).put(category, new List<ArticleWrapper>());
                }
            
                ArticleWrapper wrapper = new ArticleWrapper();
                wrapper.id = article.Id;
                wrapper.title = article.Title;
                wrapper.description = article.Summary;
                wrapper.body = article.Article__c;
                wrapper.role = article.Role__c;
            
                collectionMap.get(collection).get(category).add(wrapper);
            }
        
            // Build the collection wrappers
            List<CollectionWrapper> collections = new List<CollectionWrapper>();
        
            for(String collectionName : collectionMap.keySet()) {
                CollectionWrapper collWrapper = new CollectionWrapper();
                collWrapper.id = collectionName.replaceAll('\\s+', '_');
                collWrapper.name = collectionName;
                collWrapper.subcategories = new List<SubcategoryWrapper>();
            
                for(String categoryName : collectionMap.get(collectionName).keySet()) {
                    SubcategoryWrapper subWrapper = new SubcategoryWrapper();
                    subWrapper.id = (collectionName + '_' + categoryName).replaceAll('\\s+', '_');
                    subWrapper.name = categoryName;
                    subWrapper.articles = collectionMap.get(collectionName).get(categoryName);
                
                    collWrapper.subcategories.add(subWrapper);
                }
            
                collections.add(collWrapper);
            }
        
            return collections;
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving collection data: ' + e.getMessage());
        }
    }
    
    
    public class ArticleWrapper {
        @AuraEnabled public String id {get;set;}
        @AuraEnabled public String title {get;set;}
        @AuraEnabled public String description {get;set;}
        @AuraEnabled public String body {get;set;}  // New field for the full article body
        @AuraEnabled public String role {get;set;} // Add Role__c field with a simpler name
    }
    
    public class CollectionWrapper {
        @AuraEnabled public String id {get;set;}
        @AuraEnabled public String name {get;set;}
        @AuraEnabled public List<SubcategoryWrapper> subcategories {get;set;}
    }

    public class SubcategoryWrapper {
        @AuraEnabled public String id {get;set;}
        @AuraEnabled public String name {get;set;}
        @AuraEnabled public List<ArticleWrapper> articles {get;set;}
    }

    @AuraEnabled(cacheable=true)
    public static Knowledge__kav getArticle(String UrlName, String recordId){
        try {
            if (!String.isBlank(recordId)) {
                // Query by Id
                return [
                    SELECT Id, Title, Media_Id__c, Media_Type__c, Summary__c, Question__c, CreatedDate,
                           Collection__c, Collection_Category__c, ArticleCaseAttachCount, ArticleTotalViewCount,
                           KnowledgeArticleId, Article__c, Step_by_Step__c, UrlName, Role__c,
                           Do_Not_Show_Collection_On_Community__c, Do_Not_Show_Collection_On_Public_KB__c, 
                           Navigation_Title__c, Expand_Navigation__c
                    FROM Knowledge__kav
                    WHERE Id = :recordId
                    LIMIT 1
                ];
            } else if (!String.isBlank(UrlName)) {
                // Query by UrlName
                return [
                    SELECT Id, Title, Media_Id__c, Media_Type__c, Summary__c, Question__c, CreatedDate,
                           Collection__c, Collection_Category__c, ArticleCaseAttachCount, ArticleTotalViewCount,
                           KnowledgeArticleId, Article__c, Step_by_Step__c, UrlName, Role__c,
                           Do_Not_Show_Collection_On_Community__c, Do_Not_Show_Collection_On_Public_KB__c, 
                           Navigation_Title__c, Expand_Navigation__c
                    FROM Knowledge__kav
                    WHERE UrlName = :UrlName
                    AND PublishStatus = 'Online'
                    LIMIT 1
                ];
            } else {
                return null;
            }
        } catch (Exception e) {
            System.debug('Exception: ' + e);
            return null;
        }
    }
}

