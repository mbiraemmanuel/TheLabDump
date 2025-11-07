public with sharing class CmsPdfController {
    public String contentKey { 
        get {
            if (contentKey == null) {
                contentKey = ApexPages.currentPage().getParameters().get('contentKey');
            }
            return contentKey;
        } 
        set; 
    }
    
    public String language { 
        get {
            if (language == null) {
                language = ApexPages.currentPage().getParameters().get('language');
                if (String.isBlank(language)) {
                    language = 'en_US';
                }
            }
            return language;
        } 
        set; 
    }
    
    // For Visualforce - returns an iframe that displays the PDF inline
    public String getPdfBlob() {
        if (String.isBlank(contentKey)) {
            return '<div style="padding: 20px; color: red;">Error: Missing contentKey parameter</div>';
        }
        
        String pdfUrl = '/sfsites/c/cms/delivery/media/' + contentKey + 
                        '?language=' + EncodingUtil.urlEncode(language, 'UTF-8');
        
        // Return an iframe that embeds the PDF
        return '<iframe src="' + pdfUrl + '#toolbar=1&navpanes=0&scrollbar=1" ' +
               'style="width:100%; height:100vh; border:none;" ' +
               'type="application/pdf"></iframe>';
    }
    
    // For Aura/LWC - just return the URL
    @AuraEnabled(cacheable=true)
    public static String getPdfUrlByContentKey(String contentKey, String language) {
        if (String.isBlank(contentKey)) {
            throw new AuraHandledException('Missing contentKey');
        }
        String lang = String.isBlank(language) ? 'en_US' : language;
        return '/sfsites/c/cms/delivery/media/' + contentKey +
               '?language=' + EncodingUtil.urlEncode(lang, 'UTF-8');
    }
    
    // Property for Visualforce page to access
    public String pdfBlob {
        get {
            return getPdfBlob();
        }
    }
}
