public with sharing class CommunityAuthController {
    @AuraEnabled(cacheable=false)
    public static String getSuccessFrontdoorUrl() {
        // Get the session ID for the current user
        String sessionId = UserInfo.getSessionId();

        // Build the frontdoor URL for success.voicebrook.com 
        // pointing to that community’s main page (or any sub-path).
        // This example just goes to the root, i.e. /secur/frontdoor.jsp
        // If your success community is hosted under e.g. success.voicebrook.com/somePath, adjust accordingly.
        
        String domain = 'https://voicebrook--mufasa.sandbox.my.site.com'; 
        String frontdoor = domain + '/secur/frontdoor.jsp?sid=' + sessionId;

        return frontdoor;
    }
}
