# Back Button LWC Component

A Lightning Web Component that provides a back button for Salesforce Experience Sites and standard Lightning pages.

## Features
- ✅ Uses browser history API (`window.history.back()`)
- ✅ Works in Experience Sites (Communities)
- ✅ Works in Lightning App Builder
- ✅ Fallback to home page if no history exists
- ✅ Uses Lightning Design System styling
- ✅ Accessible with keyboard navigation

## Installation

1. Deploy the component to your Salesforce org:
   ```bash
   sf project deploy start -d force-app/main/default/lwc/backButton
   ```

2. The component is now available in:
   - Experience Builder
   - Lightning App Builder
   - Lightning Record Pages
   - Lightning Home Pages

## Usage in Experience Sites

### Using Experience Builder:
1. Open your Experience Site in Experience Builder
2. Navigate to the page where you want to add the back button
3. In the Components panel, search for "Back Button"
4. Drag and drop the component onto your page
5. Publish your changes

### Using in Custom LWC:
```html
<template>
    <div class="container">
        <c-back-button></c-back-button>
        <!-- Your other content -->
    </div>
</template>
```

## Usage in Lightning App Builder

1. Edit a Lightning page in App Builder
2. Find "Back Button" in the Custom components section
3. Drag it onto your page
4. Save and activate

## How It Works

1. **Primary Behavior**: Uses `window.history.back()` to navigate to the previous page in the browser session
2. **Fallback**: If no history exists (e.g., user landed directly on the page), navigates to the home page

## Customization

You can customize the component by modifying:

- **Label**: Edit `backButton.html` to change button text
- **Icon**: Change `icon-name` attribute in the template
- **Styling**: Modify `backButton.css` for custom styling
- **Fallback URL**: Edit the NavigationMixin logic in `backButton.js`

## Browser Compatibility

Works in all modern browsers that support:
- ES6+
- History API
- Lightning Web Components

## Technical Details

- **API Version**: 63.0
- **Type**: Lightning Web Component
- **Targets**: Experience Sites, App Pages, Record Pages, Home Pages
- **Dependencies**: `lightning/navigation`

## Support

For issues or questions, contact your Salesforce administrator.
