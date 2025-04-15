@isTest(SeeAllData=true)
private class IdeasComponentZoneChoiceTest {

    @isTest
    static void testGetDefaultValue() {
        IdeasComponentZoneChoice zoneChoice = new IdeasComponentZoneChoice();
        VisualEditor.DataRow defaultValue = zoneChoice.getDefaultValue();

        // Query an active community record for comparison
        List<Community> zones = [SELECT Id, Name FROM Community WHERE IsActive = true LIMIT 1];
        
        if (!zones.isEmpty()) {
            Community expectedZone = zones[0];
            System.assertEquals(expectedZone.Name, defaultValue.getLabel(), 
                'Default label should match the active Community name.');
            System.assertEquals(expectedZone.Name, defaultValue.getValue(), 
                'Default value should match the active Community name.');
        } else {
            System.assertEquals('No Zones Available', defaultValue.getLabel(), 
                'Default label should be "No Zones Available" when no active zones exist.');
            System.assertEquals('', defaultValue.getValue(), 
                'Default value should be empty when no active zones exist.');
        }
    }

    @isTest
    static void testGetValues() {
        IdeasComponentZoneChoice zoneChoice = new IdeasComponentZoneChoice();
        VisualEditor.DynamicPickListRows rows = zoneChoice.getValues();
        
        // Query all active Community records sorted by name
        List<Community> zones = [SELECT Id, Name FROM Community WHERE IsActive = true ORDER BY Name];

        if (zones.isEmpty()) {
            System.assertEquals(0, rows.size(), 
                'If no active zones exist, the returned pick list rows should be empty.');
        } else {
            System.assertEquals(zones.size(), rows.size(), 
                'The number of rows should match the number of active Community records.');
            for (Integer i = 0; i < zones.size(); i++) {
                Community zone = zones[i];
                VisualEditor.DataRow row = rows.get(i);
                System.assertEquals(zone.Name, row.getLabel(), 
                    'Row label should match the Community name.');
                // System.assertEquals(zone.Name, row.getValue(), 
                //     'Row value should match the Community name.');
            }
        }
    }
}
