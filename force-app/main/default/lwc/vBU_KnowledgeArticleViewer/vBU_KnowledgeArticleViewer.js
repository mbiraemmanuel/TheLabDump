import { LightningElement, api, wire } from 'lwc';
import getCollectionData from '@salesforce/apex/VBU_KnowledgeController.getCollectionData';
import { CurrentPageReference } from "lightning/navigation";


export default class VbuKnowledgeArticleViewer extends LightningElement {
    // Data
    collections = [];
    loading = true;
    error = '';

    // URL parameters
    urlName = '';

    // API properties for optional filtering
    @api activeArticleId;
    @api activeCollectionId;
    @api activeCollectionName;

    connectedCallback() {
        this.loadCollectionData();
    }
    
    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
        this.urlName = currentPageReference.attributes.urlName;
        }
        console.log(currentPageReference);
        console.log("State Parameters");
        console.log(this.urlName);
    }


    async loadCollectionData() {
        try {
            const data = await getCollectionData();
            let collections = data.map(collection => ({
                ...collection,
                subcategories: collection.subcategories.map(subcat => ({
                    ...subcat,
                    isExpanded: false
                }))
            }));

            if (this.activeArticleId) {
                // Filter down to only the collection that has the active article
                const matchingCollection = collections.find(c =>
                    c.subcategories.some(subcat =>
                        subcat.articles.some(article => article.id === this.activeArticleId)
                    )
                );
                if (matchingCollection) {
                    // Expand only the subcategory that contains the active article
                    matchingCollection.subcategories = matchingCollection.subcategories.map(subcat => {
                        if (subcat.articles.some(article => article.id === this.activeArticleId)) {
                            return { ...subcat, isExpanded: true };
                        }
                        return subcat;
                    });
                    collections = [matchingCollection];
                }
            } else if (this.activeCollectionId) {
                // Filter to the specified collection
                collections = collections.filter(c => c.id === this.activeCollectionId);
            }

            this.collections = collections;
            this.loading = false;
        } catch (err) {
            this.error = err.message;
            this.loading = false;
        }
    }

    // Toggles a subcategory within a collection
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

    // When user selects a radio button for an article
    handleArticleSelection(event) {
        this.activeArticleId = event.target.value;
        // Dispatch an event if you want a parent to know about this
        this.dispatchEvent(
            new CustomEvent('articlechange', {
                detail: this.activeArticle
            })
        );
        // Re-trigger rendering
        this.collections = [...this.collections];
    }

    // Compute UI properties for each collection, subcategory, and article
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
                    isSelected: this.activeArticleId === article.id
                }))
            }))
        }));
    }

    getCollectionIcon(name) {
        const iconMap = {
            Pathology: 'utility:microscope',
            Voicebrook: 'utility:company',
            'VoiceOver PRO': 'utility:voice',
            'Your Role': 'utility:user'
        };
        return iconMap[name] || 'utility:knowledge_base';
    }

    // Find the currently active article
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