global class IdeasComponentZoneChoice extends VisualEditor.DynamicPickList {
    global override VisualEditor.DataRow getDefaultValue() {
        // Query a single active zone. Using Name as both label & value.
        List<Community> zones = [
            SELECT Id, Name
            FROM Community
            WHERE IsActive = true
            LIMIT 1
        ];
        
        if (!zones.isEmpty()) {
            Community defaultZone = zones[0];
            // Use the zone name for both label and value.
            return new VisualEditor.DataRow(defaultZone.Name, defaultZone.Name);
        }
        
        // No zone found
        return new VisualEditor.DataRow('No Zones Available', '');
    }
    
    global override VisualEditor.DynamicPickListRows getValues() {
        // Return all active zones, storing Name as both label & value.
        VisualEditor.DynamicPickListRows myValues = new VisualEditor.DynamicPickListRows();
        
        for (Community zone : [
            SELECT Id, Name
            FROM Community
            WHERE IsActive = true
            ORDER BY Name
        ]) {
            myValues.addRow(new VisualEditor.DataRow(zone.Name, zone.Name));
        }
        
        return myValues;
    }
}
