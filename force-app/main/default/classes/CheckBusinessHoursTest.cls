@isTest
private class CheckBusinessHoursTest {
    
    @isTest
    static void testCheckIfWithinBusinessHours() {
        // Attempt to query the default Business Hours from your org.
        // Most orgs have a default Business Hours record by default.
        BusinessHours defaultBH = [
            SELECT Id 
            FROM BusinessHours 
            WHERE IsDefault = true 
            LIMIT 1
        ];
        
        // Create a valid request using the default Business Hours record.
        CheckBusinessHours.Request validRequest = new CheckBusinessHours.Request();
        validRequest.businessHoursId = defaultBH.Id;
        
        // Create a second request with a null Business Hours Id to test null handling.
        CheckBusinessHours.Request nullRequest = new CheckBusinessHours.Request();
        nullRequest.businessHoursId = null;
        
        // Prepare the list of requests
        List<CheckBusinessHours.Request> requests = new List<CheckBusinessHours.Request>{
            validRequest, 
            nullRequest
        };
        
        // Call the method under test
        List<CheckBusinessHours.Result> results = CheckBusinessHours.checkIfWithinBusinessHours(requests);
        
        // We expect two results because we passed in two requests
        System.assertEquals(2, results.size(), 'Should return exactly two results');
        
        // First result corresponds to the valid BH Id
        // Note: Whether it's TRUE or FALSE depends on when the test executes 
        //       relative to the default business hours. So, we just ensure it's a boolean (not null).
        System.assertNotEquals(null, results[0].isWithin,
            'First result (valid BH Id) should return a non-null Boolean');
        
        // Second result should be false because the BH Id is null
        System.assertEquals(false, results[1].isWithin,
            'Second result (null BH Id) should return false');
    }
}
