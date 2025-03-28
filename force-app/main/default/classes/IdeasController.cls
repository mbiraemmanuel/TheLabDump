public with sharing class IdeasController {

    /**
     * Retrieves a list of ideas using the standard Idea object
     * @return List<IdeaWrapper> - List of idea wrappers
     */
    @AuraEnabled(cacheable=true)
    public static List<IdeaWrapper> getIdeas() {
        List<IdeaWrapper> ideaWrappers = new List<IdeaWrapper>();

        // Query for native Idea records
        // Note: The VoteScore field is read-only, automatically reflecting the net votes.
        //       IdeaComments is the child relationship name for comments on an Idea.
        List<Idea> ideas = [
            SELECT 
                Id,
                Title,
                Body,
                Categories,
                Status,
                VoteScore,
                VoteTotal,
                CreatedDate,
                CreatedById,
                CreatedBy.Name,
                CreatedBy.SmallPhotoUrl,
                (SELECT Id FROM Comments)
            FROM Idea
            ORDER BY CreatedDate DESC
            LIMIT 100
        ];

        // Current user for reference checks
        Id currentUserId = UserInfo.getUserId();

        // Convert Ideas to wrapper objects
        for (Idea idea : ideas) {
            IdeaWrapper wrapper = new IdeaWrapper();
            wrapper.id = idea.Id;
            wrapper.title = idea.Title;
            wrapper.description = idea.Body;
            wrapper.category = idea.Categories;
            wrapper.status = idea.Status;
            
            // VoteScore is read-only; map it to wrapper "points"
            wrapper.points = (idea.VoteScore != null) 
                ? Integer.valueOf(idea.VoteScore) 
                : 0;

            // VoteTotal is read-only; map it to wrapper "voteTotal" divide by 10 to get the number of votes
            wrapper.voteTotal = (idea.VoteTotal != null) 
                ? Integer.valueOf(idea.VoteTotal) / 10
                : 0;

            wrapper.createdDate = idea.CreatedDate;
            wrapper.formattedDate = idea.CreatedDate.format('MMMM d, yyyy');
            wrapper.authorId = idea.CreatedById;
            wrapper.authorName = idea.CreatedBy.Name;
            wrapper.authorPhotoUrl = idea.CreatedBy.SmallPhotoUrl;

            // Count of Comments
            wrapper.commentCount = idea.Comments.size();

            // Assign a CSS class based on the Status picklist
            if (idea.Status == 'New') {
                wrapper.statusClass = 'status-new';
            } else if (idea.Status == 'Backlog' || idea.Status == 'Product Backlog') {
                wrapper.statusClass = 'status-backlog';
            } else if (idea.Status == 'In Progress') {
                wrapper.statusClass = 'status-in-progress';
            } else {
                wrapper.statusClass = 'status-default';
            }

            // Check if current user is the author
            wrapper.isCurrentUserAuthor = (idea.CreatedById == currentUserId);

            // For simplicity, default these to false
            // In a real app, you would query IdeaComment and IdeaVote to see if
            // the current user has commented or voted already.
            wrapper.isCommentedByCurrentUser = false;
            wrapper.isVotedByCurrentUser = false;

            ideaWrappers.add(wrapper);
        }

        return ideaWrappers;
    }

    /**
     * Retrieves comments for a specific idea using the standard IdeaComment object
     * @param ideaId The ID of the idea
     * @return List<CommentWrapper> - List of comment wrappers
     */
    @AuraEnabled
    public static List<CommentWrapper> getComments(Id ideaId) {
        if (ideaId == null) {
            throw new AuraHandledException('Idea ID is required');
        }

        List<CommentWrapper> commentWrappers = new List<CommentWrapper>();

        // Query native IdeaComment records
        // CommentBody is the text field for an IdeaComment
        List<IdeaComment> comments = [
            SELECT 
                Id,
                CommentBody,
                CreatedDate,
                CreatedById,
                CreatedBy.Name,
                CreatedBy.SmallPhotoUrl
            FROM IdeaComment
            WHERE IdeaId = :ideaId
            ORDER BY CreatedDate ASC
        ];

        // Convert IdeaComments to our wrapper
        for (IdeaComment comment : comments) {
            CommentWrapper wrapper = new CommentWrapper();
            wrapper.id = comment.Id;
            wrapper.text = comment.CommentBody;
            wrapper.createdDate = comment.CreatedDate;
            wrapper.formattedDate = comment.CreatedDate.format('MMMM d, yyyy');
            wrapper.authorId = comment.CreatedById;
            wrapper.authorName = comment.CreatedBy.Name;
            wrapper.authorPhotoUrl = comment.CreatedBy.SmallPhotoUrl;

            commentWrappers.add(wrapper);
        }

        return commentWrappers;
    }

    /**
     * Creates a new idea using the standard Idea object
     * @param title The title of the idea
     * @param category The category (mapped to the Categories field, which is a multipicklist)
     * @param description The body (mapped to the Body field)
     * @return Id - The ID of the created idea
     */
    @AuraEnabled
    public static Id createIdea(String title, String category, String description) {
        // Validate input
        if (String.isBlank(title) || String.isBlank(category) || String.isBlank(description)) {
            throw new AuraHandledException('All fields are required');
        }

        // Create and insert the native Idea record
        Idea newIdea = new Idea(
            Title = title,
            Body = description,
            Categories = category,
            Status = 'New',
            CommunityId = '09a800000000YqlAAE'
        );

        try {
            insert newIdea;
            return newIdea.Id;
        } catch (Exception e) {
            throw new AuraHandledException('Error creating idea: ' + e.getMessage());
        }
    }

    /**
     * Adds a comment to an idea using the standard IdeaComment object
     * @param ideaId The ID of the idea
     * @param commentText The text of the comment
     * @return Id - The ID of the created comment
     */
    @AuraEnabled
    public static Id addComment(Id ideaId, String commentText) {
        // Validate input
        if (ideaId == null || String.isBlank(commentText)) {
            throw new AuraHandledException('Idea ID and comment text are required');
        }

        // Create and insert a new IdeaComment
        IdeaComment comment = new IdeaComment(
            IdeaId = ideaId,
            CommentBody = commentText
        );

        try {
            insert comment;
            return comment.Id;
        } catch (Exception e) {
            throw new AuraHandledException('Error adding comment: ' + e.getMessage());
        }
    }

    /**
     * Casts an up or down vote for an idea using the standard Vote object
     * @param ideaId The ID of the idea
     * @param voteType 'up' or 'down'
     * @return Boolean - True if the vote was successful
     */
    @AuraEnabled
    public static Boolean voteForIdea(Id ideaId, String voteType) {
        // Validate input
        if (ideaId == null || String.isBlank(voteType)) {
            throw new AuraHandledException('Idea ID and vote type are required');
        }

        // Check if this user has already voted for the idea
        List<Vote> existingVotes = [
            SELECT Id, Type
            FROM Vote
            WHERE ParentId = :ideaId
            AND CreatedById = :UserInfo.getUserId()
            LIMIT 1
        ];

        // Determine whether this is an upvote or downvote
        String voteTypeValue = (voteType.toLowerCase() == 'up') ? 'Up' : 'Down';

        if (existingVotes.isEmpty()) {
            // If no existing vote, create a new one
            Vote newVote = new Vote(
                ParentId = ideaId,
                Type = voteTypeValue
            );
            insert newVote;
        } else {
            // If a vote already exists, update it if necessary
            Vote existingVote = existingVotes[0];
            if (existingVote.Type != voteTypeValue) {
                existingVote.Type = voteTypeValue;
                update existingVote;
            }
        }
        return true;
    }

    /**
     * Retrieves the current user's photo URL
     * @return String - The URL of the current user's photo
     */

    @AuraEnabled(cacheable=true)
    public static String getCurrentUserPhotoUrl() {
        return [
            SELECT SmallPhotoUrl
            FROM User
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ].SmallPhotoUrl;
    }

    /**
     * Retrieves category options for the idea form
     * Fetches categories from the Idea object's Categories field picklist values
     * @return List<String> - List of category options
     */
    @AuraEnabled(cacheable=true)
    public static List<String> getCategoryOptions() {
        List<String> options = new List<String>();
        
        // Get the describe result for the Idea object
        Schema.DescribeSObjectResult describeResult = Schema.SObjectType.Idea;
        
        // Get the field describe for the Categories field
        Schema.DescribeFieldResult fieldResult = describeResult.fields.getMap().get('Categories').getDescribe();
        
        // Check if it's a multi-picklist field (which Categories is)
        if (fieldResult.getType() == Schema.DisplayType.MULTIPICKLIST || 
            fieldResult.getType() == Schema.DisplayType.PICKLIST) {
            
            // Get the picklist values
            List<Schema.PicklistEntry> picklistValues = fieldResult.getPicklistValues();
            
            // Extract the label from each picklist entry
            for (Schema.PicklistEntry entry : picklistValues) {
                if (entry.isActive()) {
                    options.add(entry.getLabel());
                }
            }
        }
        
        return options;
    }




    /**
     * Wrapper class for picklist options
     */
    public class PicklistOptionWrapper {
        @AuraEnabled public String label;
        @AuraEnabled public String value;
        
        public PicklistOptionWrapper(String label, String value) {
            this.label = label;
            this.value = value;
        }
    }

    /**
     * Retrieves status options for the idea form
     * Fetches status from the Idea object's Status field picklist values
     * @return List<PicklistOptionWrapper> - List of status options with label and value
     */
    @AuraEnabled(cacheable=true)
    public static List<PicklistOptionWrapper> getStatusOptions() {
        List<PicklistOptionWrapper> options = new List<PicklistOptionWrapper>();
        
        // Get the describe result for the Idea object
        Schema.DescribeSObjectResult describeResult = Schema.SObjectType.Idea;
        
        // Get the field describe for the Status field
        Schema.DescribeFieldResult fieldResult = describeResult.fields.getMap().get('Status').getDescribe();
        
        // Check if it's a picklist field
        if (fieldResult.getType() == Schema.DisplayType.PICKLIST) {
            
            // Get the picklist values
            List<Schema.PicklistEntry> picklistValues = fieldResult.getPicklistValues();
            
            // Create a wrapper object for each picklist entry
            for (Schema.PicklistEntry entry : picklistValues) {
                if (entry.isActive()) {
                    options.add(new PicklistOptionWrapper(entry.getLabel(), entry.getValue()));
                }
            }
        }
        
        return options;
    }

    /**
     * Wrapper class for ideas
     */
    public class IdeaWrapper {
        @AuraEnabled public Id id;
        @AuraEnabled public String title;
        @AuraEnabled public String description;
        @AuraEnabled public String category;
        @AuraEnabled public String status;
        @AuraEnabled public Integer points;
        @AuraEnabled public Integer voteTotal;
        @AuraEnabled public Datetime createdDate;
        @AuraEnabled public String formattedDate;
        @AuraEnabled public Id authorId;
        @AuraEnabled public String authorName;
        @AuraEnabled public String authorPhotoUrl;
        @AuraEnabled public Integer commentCount;
        @AuraEnabled public String statusClass;
        @AuraEnabled public Boolean isCurrentUserAuthor;
        @AuraEnabled public Boolean isCommentedByCurrentUser;
        @AuraEnabled public Boolean isVotedByCurrentUser;
        @AuraEnabled public List<CommentWrapper> comments;

        public IdeaWrapper() {
            this.comments = new List<CommentWrapper>();
        }
    }

    /**
     * Wrapper class for comments
     */
    public class CommentWrapper {
        @AuraEnabled public Id id;
        @AuraEnabled public String text;
        @AuraEnabled public Datetime createdDate;
        @AuraEnabled public String formattedDate;
        @AuraEnabled public Id authorId;
        @AuraEnabled public String authorName;
        @AuraEnabled public String authorPhotoUrl;
    }
}
