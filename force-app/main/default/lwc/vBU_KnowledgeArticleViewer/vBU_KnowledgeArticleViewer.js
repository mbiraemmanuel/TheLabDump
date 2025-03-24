import { LightningElement, api, wire, track } from 'lwc';
import getCollectionData from '@salesforce/apex/VBU_KnowledgeController.getCollectionData';
import getArticle from '@salesforce/apex/VBU_KnowledgeController.getArticle';
import getPdfAsBase64 from '@salesforce/apex/PdfFileController.getPdfAsBase64';

import { CurrentPageReference } from 'lightning/navigation';
import { NavigationMixin } from 'lightning/navigation';

export default class VbuKnowledgeArticleViewer extends NavigationMixin(LightningElement) {
    // Data properties
    collections = [];
    loading = true;
    error = '';
    @track pdfUrl;
    contentVersionId = '068WE000005j7orYAA';

    // URL parameter
    urlName = '';

    // API properties
    @api activeArticleId;
    @api activeCollectionName;
    @api activeCollectionId;

    @api recordId;

    // PDF height in rem (if media is PDF)
    @api heightInRem = '40';

    // Capture the URL parameter using wire
    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.urlName = currentPageReference.attributes.urlName || '';
            console.log('CurrentPageReference:', currentPageReference);
            console.log('URL Param (urlName):', this.urlName);
        }
    }

    connectedCallback() {
        this.loadCollectionData();
    }

    async loadCollectionData() {
        try {
            let data = await getCollectionData();

            // 1) Transform each article so it has 'id' instead of 'Id'
            let collections = data.map(collection => ({
                ...collection,
                subcategories: collection.subcategories.map(subcat => ({
                    ...subcat,
                    isExpanded: false,
                    articles: subcat.articles.map(a => ({
                        ...a
                    }))
                }))
            }));

            // Scenario 1: If urlName is present
            if (this.urlName) {
                const result = await getArticle({ UrlName: this.urlName });
                if (!result) {
                    this.error = 'No article found for the provided URL.';
                    this.loading = false;
                    return;
                }
                // unify the returned Apex article
                const foundArticle = { ...result, id: result.Id };

                this.activeArticleId = foundArticle.id;

                // Expand only the subcategory containing that article and only show the collection that the article has bsed of Collection__c


                // First filter collections to only include those matching the article's Collection__c
                collections = collections.filter(c => c.name === foundArticle.Collection__c);
                
                // Then expand the subcategory containing the article
                collections = collections.map(c => {
                    const updatedSubcats = c.subcategories.map(sub => {
                        const hasMatch = sub.articles.some(
                            art => art.id === foundArticle.id
                        );
                        return {
                            ...sub,
                            isExpanded: hasMatch ? true : sub.isExpanded
                        };
                    });
                    return { ...c, subcategories: updatedSubcats };
                });
                this.activeArticle = foundArticle;

                // Fetch the PDF if the article is a PDF
                if (this.isPdf) {
                    this.fetchPdf();
                }
            }
            // Scenario 2: No urlName but activeCollectionName is given
            else if (this.activeCollectionName) {
                // Filter to that one collection name
                collections = collections.filter(
                    c => c.name === this.activeCollectionName
                );
                // Expand all subcats in that collection
                collections = collections.map(c => ({
                    ...c,
                    subcategories: c.subcategories.map(subcat => ({
                        ...subcat,
                        isExpanded: true
                    }))
                }));
            }else if (this.activeCollectionName) {
                // Filter to that one collection name
                collections = collections.filter(
                    c => c.name === this.activeCollectionName
                );
                // Expand all subcats in that collection
                collections = collections.map(c => ({
                    ...c,
                    subcategories: c.subcategories.map(subcat => ({
                        ...subcat,
                        isExpanded: true
                    }))
                }));
            }
            // Scenario 3: If neither is provided, do nothing or set an error
            // else {
            //     this.error = 'No article URL or collection name was provided.';
            // }

            this.collections = collections;
            this.loading = false;
        } catch (err) {
            this.error = err.message;
            this.loading = false;
        }
    }
    
    
    fetchPdf() {
        getPdfAsBase64({ contentVersionId: this.contentVersionId })
            .then((base64Pdf) => {
                // Convert the Base64 string to a data URL
                this.pdfUrl = 'data:application/pdf;base64,' + base64Pdf;
            })
            .catch((error) => {
                this.error = error;
                console.error('Error retrieving PDF: ', error);
            });
    }
    

    // Expand/collapse
    handleCategoryToggle(event) {
        const collId = event.currentTarget.dataset.collectionId;
        const catId = event.currentTarget.dataset.categoryId;
        this.collections = this.collections.map(collection => {
            if (collection.id === collId) {
                return {
                    ...collection,
                    subcategories: collection.subcategories.map(subcat =>
                        subcat.id === catId
                            ? { ...subcat, isExpanded: !subcat.isExpanded }
                            : subcat
                    )
                };
            }
            return collection;
        });
    }

    // Handle radio selection (navigate to article record)
    handleArticleSelection(event) {
        const selectedId = event.target.value;
        if (!selectedId) {
            return;
        }
        this.activeArticleId = selectedId;
        // Optionally use NavigationMixin to open the record
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: selectedId,
                objectApiName: 'Knowledge__kav',
                actionName: 'view'
            }
        });
    }

    // Memoization for computed properties
    _memoizedCollections;
    _lastCollections;
    _lastActiveArticleId;

    get collectionsWithComputedProperties() {
        const changedCollections =
            !this._lastCollections ||
            JSON.stringify(this._lastCollections) !== JSON.stringify(this.collections);
        const changedActiveArticle =
            this._lastActiveArticleId !== this.activeArticleId;

        if (!changedCollections && !changedActiveArticle) {
            return this._memoizedCollections;
        }

        this._lastCollections = JSON.parse(JSON.stringify(this.collections));
        this._lastActiveArticleId = this.activeArticleId;

        this._memoizedCollections = this.collections.map(collection => ({
            ...collection,
            iconName: this.getCollectionIcon(collection.name),
            subcategories: collection.subcategories.map(subcat => ({
                ...subcat,
                expandIconName: subcat.isExpanded
                    ? 'utility:chevrondown'
                    : 'utility:chevronright',
                articlesListClass: subcat.isExpanded
                    ? 'articles-list expanded'
                    : 'articles-list',
                articles: subcat.articles.map(article => ({
                    ...article,
                    // Mark selected if it matches activeArticleId
                    isSelected: this.activeArticleId === article.id
                }))
            }))
        }));

        return this._memoizedCollections;
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

    // -------------------------
    // Active article
    _activeArticle;
    get activeArticle() {
        // if we have a cached article that matches the ID, return it
        if (
            this._activeArticle &&
            this._activeArticle.id === this.activeArticleId
        ) {
            return this._activeArticle;
        }
        
        return null;
    }
    set activeArticle(value) {
        this._activeArticle = value;
    }

    // -------------------------
    // Media Computed Properties
    get showMedia() {
        return this.activeArticle && this.activeArticle.Media_Type__c;
    }
    get isPdf() {
        return this.showMedia && this.activeArticle.Media_Type__c === 'PDF';
    }
    get isVideo() {
        return this.showMedia && this.activeArticle.Media_Type__c === 'Video';
    }
    // Use renditionDownload + inline
    get pdfUrl() {
        if (!this.activeArticle?.Media_Id__c) {
            return '';
        }
        return (
            'sfc/servlet.shepherd/version/download/' + this.activeArticle.Media_Id__c
        );
    }
    get vidyardUrl() {
        return this.activeArticle
            ? `https://play.vidyard.com/${this.activeArticle.Media_Id__c}`
            : '';
    }

    get pdfHeight() {
        return this.heightInRem + 'rem';
    }
    get iframeStyle() {
        return `height: ${this.pdfHeight}; width: 100%;`;
    }
}
