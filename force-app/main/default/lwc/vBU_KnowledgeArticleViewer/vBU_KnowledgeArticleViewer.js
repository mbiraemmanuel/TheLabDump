import { LightningElement, api, wire } from 'lwc';
import getCollectionData from '@salesforce/apex/VBU_KnowledgeController.getCollectionData';
import getArticle from '@salesforce/apex/VBU_KnowledgeController.getArticle'; // used to get article by UrlName
import { CurrentPageReference } from 'lightning/navigation';
import { NavigationMixin } from 'lightning/navigation';

export default class VbuKnowledgeArticleViewer extends NavigationMixin(LightningElement) {
    // Data properties for collections, loading, error
    collections = [];
    loading = true;
    error = '';

    // URL parameter: we'll capture urlName from the page.
    urlName = '';

    // API properties for filtering.
    @api activeArticleId;
    // We'll use activeCollectionName if there's no URL param
    @api activeCollectionName;
    @api activeCollectionId; // (if needed in other logic, otherwise can be removed)

    // ---------------------------------------------------
    // Capture the URL parameter using the wire adapter.
    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            // Get the urlName from the current page attributes.
            this.urlName = currentPageReference.attributes.urlName || '';
            console.log('CurrentPageReference:', currentPageReference);
            console.log('URL Parameter (urlName):', this.urlName);
        }
    }

    // ---------------------------------------------------
    // Call loadCollectionData() in connectedCallback() as before.
    connectedCallback() {
        this.loadCollectionData();
    }

    // ---------------------------------------------------
    // Load collections data from Apex and apply the three scenarios.
    async loadCollectionData() {
        try {
            const data = await getCollectionData();
            // Prepare the default 'isExpanded' = false for all subcategories:
            let collections = data.map(collection => ({
                ...collection,
                subcategories: collection.subcategories.map(subcat => ({
                    ...subcat,
                    isExpanded: false
                }))
            }));

            // Scenario 1: If a URL parameter (urlName) exists...
            if (this.urlName) {
                await getArticle({ UrlName: this.urlName })
                    .then(result => {
                        if (!result) {
                            // If no article is returned, set an error and stop.
                            this.error = 'No article found for the provided URL.';
                            this.loading = false;
                            return;
                        }
                        console.log('Loaded article by UrlName:', result);
                        // Set the active Article Id
                        this.activeArticleId = result.Id;

                        // Find the single collection containing this article:
                        const matchingCollection = collections.find(c =>
                            c.subcategories.some(subcat =>
                                subcat.articles.some(article => article.id === result.Id)
                            )
                        );

                        // If found, keep only that collection and expand the relevant subcategory:
                        if (matchingCollection) {
                            matchingCollection.subcategories = matchingCollection.subcategories.map(subcat => {
                                // Expand only the one subcategory that has our article:
                                const hasArticle = subcat.articles.some(article => article.id === result.Id);
                                return {
                                    ...subcat,
                                    isExpanded: hasArticle ? true : false
                                };
                            });
                            // Keep only that one matching collection
                            collections = [matchingCollection];
                        } else {
                            // If no matching collection is found for this article, show an error.
                            this.error = 'No matching collection found for this article.';
                        }
                    })
                    .catch(error => {
                        console.error('Error loading article by urlName:', error);
                        this.error = error.message;
                    });
            }
            // Scenario 2: If there's no urlName but we do have activeCollectionName
            else if (this.activeCollectionName) {
                // Filter to just that collection
                collections = collections.filter(c => c.name === this.activeCollectionName);

                // Expand all subcategories in that collection
                collections = collections.map(collection => ({
                    ...collection,
                    subcategories: collection.subcategories.map(subcat => ({
                        ...subcat,
                        isExpanded: true
                    }))
                }));
            }
            // Scenario 3: If neither is available, show an error and stop.
            else {
                this.error = 'No article URL or collection name was provided.';
            }

            // Store the processed collections
            this.collections = collections;
            this.loading = false;
        } catch (err) {
            this.error = err.message;
            this.loading = false;
        }
    }

    // ---------------------------------------------------
    // Toggle subcategory expand/collapse (unchanged)
    handleCategoryToggle(event) {
        const collectionId = event.currentTarget.dataset.collectionId;
        const categoryId = event.currentTarget.dataset.categoryId;
        this.collections = this.collections.map(collection => {
            if (collection.id === collectionId) {
                return {
                    ...collection,
                    subcategories: collection.subcategories.map(subcat =>
                        subcat.id === categoryId
                            ? { ...subcat, isExpanded: !subcat.isExpanded }
                            : subcat
                    )
                };
            }
            return collection;
        });
    }

    // ---------------------------------------------------
    // When a radio button is selected, navigate to the article's record page.
    handleArticleSelection(event) {
        const selectedId = event.target.value;
        if (!selectedId) {
            return;
        }
        this.activeArticleId = selectedId;
        // Use NavigationMixin to navigate to the record page.
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: selectedId,
                objectApiName: 'Knowledge__kav',
                actionName: 'view'
            }
        });
    }

    // ---------------------------------------------------
    // Computed property that injects extra UI properties into collections.
    get collectionsWithComputedProperties() {
        return this.collections.map(collection => ({
            ...collection,
            iconName: this.getCollectionIcon(collection.name),
            subcategories: collection.subcategories.map(subcat => ({
                ...subcat,
                expandIconName: subcat.isExpanded ? 'utility:chevrondown' : 'utility:chevronright',
                articlesListClass: subcat.isExpanded ? 'articles-list expanded' : 'articles-list',
                articles: subcat.articles.map(article => ({
                    ...article,
                    // Mark as selected if the article.id matches activeArticleId
                    isSelected: this.activeArticleId === article.id
                }))
            }))
        }));
    }

    // ---------------------------------------------------
    // Utility method for collection icons
    getCollectionIcon(name) {
        const iconMap = {
            Pathology: 'utility:microscope',
            Voicebrook: 'utility:company',
            'VoiceOver PRO': 'utility:voice',
            'Your Role': 'utility:user'
        };
        return iconMap[name] || 'utility:knowledge_base';
    }

    // ---------------------------------------------------
    // Return the currently active article object (if any)
    get activeArticle() {
        for (const collection of this.collections) {
            for (const subcat of collection.subcategories) {
                const found = subcat.articles.find(a => a.id === this.activeArticleId);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }
}