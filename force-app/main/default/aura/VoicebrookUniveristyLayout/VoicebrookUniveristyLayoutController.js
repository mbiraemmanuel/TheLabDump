({
    doInit: function(component, event, helper) {
        // Example logic to detect the home page; adjust as needed
        var currentPath = window.location.pathname;
		console.log('currentPath: ' + currentPath);
        if (currentPath === '/vbu/s/' || currentPath === '/s/' || currentPath.toLowerCase().indexOf('home') !== -1) {
            component.set("v.isHome", true);
        } else {
            component.set("v.isHome", true);
        }
    },

    handleRouteChange : function(component, event, helper) {
        var currentPath = window.location.pathname;
        console.log('currentPath: ' + currentPath);
        if (currentPath === '/vbu/s/' || currentPath === '/s/' || currentPath.toLowerCase().indexOf('home') !== -1) {
            component.set("v.isHome", true);
        } else {
            component.set("v.isHome", false);
        }
    }
})