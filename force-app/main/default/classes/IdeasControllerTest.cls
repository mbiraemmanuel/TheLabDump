@isTest(SeeAllData=true)
private class IdeasControllerTest {

    @isTest
    static void testGetIdeas() {
        // Insert an Idea record so that getIdeas returns data
        Idea testIdea = new Idea(
            Title = 'Test Idea for getIdeas',
            Body = 'Test Idea Body',
            Categories = 'TestCategory',
            Status = 'New',
            Priority__c = 'Medium',
            CommunityId = '09a800000000YqlAAE'
        );
        insert testIdea;
        
        // Call getIdeas without zone filtering
        Test.startTest();
        List<IdeasController.IdeaWrapper> wrappersNoZone = IdeasController.getIdeas('');
        
        System.assertNotEquals(null, wrappersNoZone, 'getIdeas without zone filter should return a non-null list');

        Boolean ideaFound = false;
        for (IdeasController.IdeaWrapper wrap : wrappersNoZone) {
            if (wrap.title == 'Test Idea for getIdeas') {
                ideaFound = true;
                // Verify the formatted date is not blank
                System.assertNotEquals('', wrap.formattedDate, 'Formatted date should be populated');
                // The comment count should be zero for this record
                System.assertEquals(0, wrap.commentCount, 'There should be zero comments initially');
                break;
            }
        }
        System.assert(ideaFound, 'Inserted Idea should be found in the getIdeas results');
        
        List<IdeasController.IdeaWrapper> wrappersZone = IdeasController.getIdeas('09a800000000YqlAAE');
        Test.stopTest();
        
        Boolean ideaFoundZone = false;
        for (IdeasController.IdeaWrapper wrap : wrappersZone) {
            if (wrap.title == 'Test Idea for getIdeas') {
                ideaFoundZone = true;
                break;
            }
        }
        System.assert(ideaFoundZone, 'Inserted Idea should be returned when filtering by CommunityId');
    }

    @isTest
    static void testGetComments() {
        // Create an Idea record and insert an associated IdeaComment
        Idea testIdea = new Idea(
            Title = 'Test Idea for Comments',
            Body = 'Test Idea Body',
            Categories = 'TestCategory',
            Status = 'New',
            Priority__c = 'Medium',
            CommunityId = '09a800000000YqlAAE'
        );
        insert testIdea;
        
        IdeaComment testComment = new IdeaComment(
            IdeaId = testIdea.Id,
            CommentBody = 'Test comment for idea'
        );
        insert testComment;
        
        Test.startTest();
        List<IdeasController.CommentWrapper> commentWrappers = IdeasController.getComments(testIdea.Id);
        Test.stopTest();
        
        System.assertNotEquals(null, commentWrappers, 'getComments should return a non-null list');
        System.assert(commentWrappers.size() > 0, 'At least one comment should be returned for the test Idea');
        
        // Verify that the formatted date and author fields are set
        IdeasController.CommentWrapper cw = commentWrappers[0];
        System.assertNotEquals(null, cw.formattedDate, 'Formatted date should not be null');
        System.assertNotEquals(null, cw.authorName, 'Author name should be populated');
    }

    @isTest
    static void testCreateIdea() {
        String title = 'New Idea Title';
        String category = 'NewCategory';
        String description = 'New Idea Body';
        
        Test.startTest();
        Id ideaId = IdeasController.createIdea(title, category, description);
        Test.stopTest();
        
        System.assertNotEquals(null, ideaId, 'createIdea should return a non-null Idea Id');
        
        Idea createdIdea = [SELECT Title, Body, Categories, Status, CommunityId 
                            FROM Idea 
                            WHERE Id = :ideaId 
                            LIMIT 1];
        System.assertEquals(title, createdIdea.Title, 'Title should match');
        System.assertEquals(description, createdIdea.Body, 'Body should match');
        System.assertEquals(category, createdIdea.Categories, 'Category should match');
        System.assertEquals('New', createdIdea.Status, 'Status should be "New"');
        // Verify the CommunityId was set by the controller
        System.assertEquals('09a800000000YqlAAE', createdIdea.CommunityId, 'CommunityId should match the default value');
    }

    @isTest
    static void testAddComment() {
        // Create an Idea record to add a comment against
        Idea ideaForComment = new Idea(
            Title = 'Idea For addComment',
            Body = 'Idea Body',
            Categories = 'CommentCategory',
            Status = 'New',
            Priority__c = 'Medium',
            CommunityId = '09a800000000YqlAAE'
        );
        insert ideaForComment;
        
        String commentText = 'This is a test comment';
        
        Test.startTest();
        Id commentId = IdeasController.addComment(ideaForComment.Id, commentText);
        Test.stopTest();
        
        System.assertNotEquals(null, commentId, 'addComment should return a non-null Comment Id');
        
        IdeaComment insertedComment = [SELECT CommentBody FROM IdeaComment WHERE Id = :commentId LIMIT 1];
        System.assertEquals(commentText, insertedComment.CommentBody, 'Comment text should match');
    }

    @isTest
    static void testVoteForIdea() {
        // Create an Idea record for voting tests
        Idea ideaForVote = new Idea(
            Title = 'Idea For Vote',
            Body = 'Idea Body',
            Categories = 'VoteCategory',
            Status = 'New',
            Priority__c = 'Medium',
            CommunityId = '09a800000000YqlAAE'
        );
        insert ideaForVote;
        
        // First cast an up vote
        Test.startTest();
        Boolean voteResult = IdeasController.voteForIdea(ideaForVote.Id, 'up');
        System.assert(voteResult, 'voteForIdea should return true for an up vote');
        
        // Query for the vote record and verify it is an up vote
        Vote v = [SELECT Type FROM Vote WHERE ParentId = :ideaForVote.Id AND CreatedById = :UserInfo.getUserId() LIMIT 1];
        System.assertEquals('Up', v.Type, 'The vote type should be Up');

        try{
            Boolean voteResultDown = IdeasController.voteForIdea(ideaForVote.Id, 'down');
        } catch (Exception e) {
            // exception will be thrown
        }
        Test.stopTest();
    }

    @isTest
    static void testGetCurrentUserPhotoUrl() {
        Test.startTest();
        String photoUrl = IdeasController.getCurrentUserPhotoUrl();
        Test.stopTest();
        System.assertNotEquals(null, photoUrl, 'getCurrentUserPhotoUrl should return a non-null string');
    }

    @isTest
    static void testGetCategoryOptions() {
        Test.startTest();
        List<String> categoryOptions = IdeasController.getCategoryOptions();
        Test.stopTest();
        System.assertNotEquals(null, categoryOptions, 'getCategoryOptions should return a non-null list');
        System.assert(categoryOptions.size() > 0, 'There should be at least one category option');
    }

    @isTest
    static void testGetStatusOptions() {
        Test.startTest();
        List<IdeasController.PicklistOptionWrapper> statusOptions = IdeasController.getStatusOptions();
        Test.stopTest();
        System.assertNotEquals(null, statusOptions, 'getStatusOptions should return a non-null list');
        System.assert(statusOptions.size() > 0, 'There should be at least one status option');
    }

    @isTest
    static void testGetPriorityOptions() {
        Test.startTest();
        List<IdeasController.PicklistOptionWrapper> priorityOptions = IdeasController.getPriorityOptions();
        Test.stopTest();
        System.assertNotEquals(null, priorityOptions, 'getPriorityOptions should return a non-null list');
        System.assert(priorityOptions.size() > 0, 'There should be at least one priority option');
    }

    @isTest
    static void testUpdateIdea() {
        // Create an Idea record to update
        Idea ideaToUpdate = new Idea(
            Title = 'Idea To Update',
            Body = 'Original Body',
            Categories = 'OriginalCategory',
            Status = 'New',
            Priority__c = 'Medium',
            CommunityId = '09a800000000YqlAAE'
        );
        insert ideaToUpdate;
        
        String currentUserId = UserInfo.getUserId();
        
        Test.startTest();
        // Update status
        Boolean updateStatus = IdeasController.updateIdea(ideaToUpdate.Id, 'status', 'In Progress');
        // Update category
        Boolean updateCategory = IdeasController.updateIdea(ideaToUpdate.Id, 'category', 'UpdatedCategory');
        // Update priority
        Boolean updatePriority = IdeasController.updateIdea(ideaToUpdate.Id, 'priority', 'High');
        // Update assignedTo using current user's Id
        Boolean updateAssigned = IdeasController.updateIdea(ideaToUpdate.Id, 'assignedTo', currentUserId);
        Test.stopTest();
        
        System.assert(updateStatus, 'updateIdea should return true for status update');
        System.assert(updateCategory, 'updateIdea should return true for category update');
        System.assert(updatePriority, 'updateIdea should return true for priority update');
        System.assert(updateAssigned, 'updateIdea should return true for assignedTo update');
        
        Idea updatedIdea = [SELECT Status, Categories, Priority__c, Idea_Owner__c 
                            FROM Idea WHERE Id = :ideaToUpdate.Id LIMIT 1];
        System.assertEquals('In Progress', updatedIdea.Status, 'Status should be updated to "In Progress"');
        System.assertEquals('UpdatedCategory', updatedIdea.Categories, 'Categories should be updated');
        System.assertEquals('High', updatedIdea.Priority__c, 'Priority should be updated to "High"');
        System.assertEquals(currentUserId, updatedIdea.Idea_Owner__c, 'Idea should be assigned to the current user');
    }

    @isTest
    static void testAssignToMe() {
        // Create an Idea record without an owner
        Idea ideaForAssignment = new Idea(
            Title = 'Idea For Assignment',
            Body = 'Test Body',
            Categories = 'TestCategory',
            Status = 'New',
            Priority__c = 'Medium',
            CommunityId = '09a800000000YqlAAE'
        );
        insert ideaForAssignment;
        
        Test.startTest();
        Boolean assignResult = IdeasController.assignToMe(ideaForAssignment.Id);
        Test.stopTest();
        System.assert(assignResult, 'assignToMe should return true');
        
        Idea updatedIdea = [SELECT Idea_Owner__c FROM Idea WHERE Id = :ideaForAssignment.Id LIMIT 1];
        System.assertEquals(UserInfo.getUserId(), updatedIdea.Idea_Owner__c, 'Idea should be assigned to the current user');
    }

    @isTest
    static void testGetUsers() {
        Test.startTest();
        List<User> users = IdeasController.getUsers();
        Test.stopTest();
        System.assertNotEquals(null, users, 'getUsers should return a non-null list');
        System.assert(users.size() > 0, 'There should be at least one active user returned');
    }
}
