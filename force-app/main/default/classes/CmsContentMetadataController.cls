public with sharing class CmsContentMetadataController {
    
    @AuraEnabled(cacheable=true)
    public static String getContentTitle(String contentKey) {
        try {
            // Try to query ManagedContentVersion which has access to the title
            List<ManagedContentVersion> versions = [
                SELECT ManagedContentId, Title
                FROM ManagedContentVersion
                WHERE ManagedContent.ContentKey = :contentKey
                AND PublishedDate != null
                ORDER BY PublishedDate DESC
                LIMIT 1
            ];
            
            if (!versions.isEmpty() && versions[0].Title != null) {
                return versions[0].Title;
            }
            
            return 'document';
        } catch (Exception e) {
            System.debug('Error fetching content title: ' + e.getMessage());
            System.debug('Stack trace: ' + e.getStackTraceString());
            return 'document';
        }
    }
}
