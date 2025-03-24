public with sharing class VidyardController {
    @AuraEnabled(cacheable=true)
    public static String getVidyardContent(String videoId) {
        // Build the HTTP request
        HttpRequest req = new HttpRequest();
        req.setEndpoint('https://api.vidyard.com/v1/videos/' + videoId);
        req.setMethod('GET');
        req.setHeader('Authorization', 'Bearer Ex6qieMStBhCH6fbTEFiNg'); // Update with your API token
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        // Check for a successful response
        if (res.getStatusCode() == 200) {
            return res.getBody();
        } else {
            // Handle error conditions appropriately in your implementation
            throw new AuraHandledException('Failed to retrieve video content. Status Code: ' + res.getStatusCode());
        }
    }
}
