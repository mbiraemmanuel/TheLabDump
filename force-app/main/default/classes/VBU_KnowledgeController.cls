public with sharing class VBU_KnowledgeController {
    @AuraEnabled(cacheable=true)
    public static List<CategoryWrapper> getCollectionData() {
        try {
            List<CategoryWrapper> categories = new List<CategoryWrapper>();
            
            // Query for Knowledge Articles
            // NOTE: Add Article__c (or the correct field) here
            List<Knowledge__kav> articles = [
                SELECT Id, Title, UrlName, Summary, Collection__c, Collection_Category__c,
                Article__c
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
                // Save the full article body
                wrapper.body = article.Article__c;
                
                collectionMap.get(collection).get(category).add(wrapper);
            }
            
            // Create category wrappers
            for(String collectionName : collectionMap.keySet()) {
                CategoryWrapper collection = new CategoryWrapper();
                // Generate a pseudo-ID for the collection
                collection.id = EncodingUtil.base64Encode(Crypto.generateAesKey(128)).substring(0, 15);
                collection.name = collectionName;
                collection.subcategories = new List<SubcategoryWrapper>();
                
                for(String categoryName : collectionMap.get(collectionName).keySet()) {
                    SubcategoryWrapper subcategory = new SubcategoryWrapper();
                    // Generate a pseudo-ID for the subcategory
                    subcategory.id = EncodingUtil.base64Encode(Crypto.generateAesKey(128)).substring(0, 15);
                    subcategory.name = categoryName;
                    subcategory.articles = collectionMap.get(collectionName).get(categoryName);
                    collection.subcategories.add(subcategory);
                }
                
                categories.add(collection);
            }
            
            return categories;
        } catch(Exception e) {
            throw new AuraHandledException('Error fetching knowledge articles: ' + e.getMessage());
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static Knowledge__kav getArticle(String UrlName, String recordId){
        try {
            if (!String.isBlank(recordId)) {
                // Query by Id
                return [
                    SELECT Id, Title, Media_Id__c, Media_Type__c, Summary__c, Question__c, CreatedDate,
                           Collection__c, Collection_Category__c, ArticleCaseAttachCount, ArticleTotalViewCount,
                           KnowledgeArticleId, Article__c, Step_by_Step__c, UrlName, 
                           Do_Not_Show_Collection_On_Community__c, Do_Not_Show_Collection_On_Public_KB__c, 
                           Navigation_Title__c, Expand_Navigation__c
                    FROM Knowledge__kav
                    WHERE Id = :recordId
                    AND PublishStatus = 'Online'
                    LIMIT 1
                ];
            } else if (!String.isBlank(UrlName)) {
                // Query by UrlName
                return [
                    SELECT Id, Title, Media_Id__c, Media_Type__c, Summary__c, Question__c, CreatedDate,
                           Collection__c, Collection_Category__c, ArticleCaseAttachCount, ArticleTotalViewCount,
                           KnowledgeArticleId, Article__c, Step_by_Step__c, UrlName, 
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

    
    public class CategoryWrapper {
        @AuraEnabled public String id;
        @AuraEnabled public String name;
        @AuraEnabled public List<SubcategoryWrapper> subcategories;
    }
    
    public class SubcategoryWrapper {
        @AuraEnabled public String id;
        @AuraEnabled public String name;
        @AuraEnabled public List<ArticleWrapper> articles;
    }
    
    public class ArticleWrapper {
        @AuraEnabled public String id;
        @AuraEnabled public String title;
        @AuraEnabled public String description;
        @AuraEnabled public String body;  // New field for the full article body
    }
}
