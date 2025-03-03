public with sharing class CheckBusinessHours {

    // This inner class defines the input structure for the Flow.
    // Flow can pass a list of these 'Request' objects, each containing
    // the Id of a Business Hours record.
    public class Request {
        @InvocableVariable(label='Business Hours Id' description='Id of the Business Hours record' required=true)
        public Id businessHoursId;
    }

    // This inner class defines the output structure for the Flow.
    // For each input record, we return a corresponding boolean result.
    public class Result {
        @InvocableVariable(label='Is Within Business Hours?' description='True if we are currently in the window, false otherwise')
        public Boolean isWithin;
    }

    @InvocableMethod(
        label='Check Business Hours' 
        description='Checks if the current time is within the specified Business Hours'
        category='BusinessHoursUtility'
    )
    public static List<Result> checkIfWithinBusinessHours(List<Request> requests) {
        List<Result> results = new List<Result>();

        // We iterate through each Request item in the list
        for (Request req : requests) {
            Result r = new Result();
            if (req.businessHoursId == null) {
                // If the Business Hours Id is null, we default to false
                r.isWithin = false;
            } else {
                // Use the built-in isWithin method to check current time
                r.isWithin = BusinessHours.isWithin(req.businessHoursId, DateTime.now());
            }
            results.add(r);
        }
        
        return results;
    }
}
