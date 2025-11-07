({
    doInit: function(component, event, helper) {
        // Get content key from component attribute or from URL
        var contentKey = component.get("v.contentKey");
        
        if (!contentKey || contentKey === "") {
            // Try to extract from URL
            var path = window.location.pathname || '';
            var marker = '/cms-document/';
            var idx = path.indexOf(marker);
            if (idx >= 0) {
                var tail = path.substring(idx + marker.length).replace(/\/+$/, '');
                var lastDash = tail.lastIndexOf('-');
                contentKey = lastDash > -1 ? tail.substring(lastDash + 1) : tail;
            }
        }
        
        if (contentKey) {
            var language = component.get("v.language") || 'en_US';
            
            // Get the site path prefix for Experience Cloud
            var sitePrefix = window.location.pathname.split('/s/')[0];
            if (!sitePrefix || sitePrefix === '') {
                sitePrefix = '';
            }
            
            var vfUrl = sitePrefix + '/apex/CmsPdfViewer?contentKey=' + encodeURIComponent(contentKey) + 
                        '&language=' + encodeURIComponent(language);
            component.set("v.vfPageUrl", vfUrl);
            console.log('PDF Viewer URL:', vfUrl);
            console.log('Content Key:', contentKey);
        } else {
            var errorMsg = 'No content key provided. Please set the Content Key property in Experience Builder or ensure the URL contains /cms-document/{contentKey}';
            component.set("v.errorMessage", errorMsg);
            console.error(errorMsg);
        }
    }
})
``