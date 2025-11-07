import { LightningElement, api } from 'lwc';

export default class IframeContainer extends LightningElement {
    @api articleHtml; 
    // articleHtml is expected to contain the entire HTML (with iframe) 
    // from your Knowledge Article.

    renderedCallback() {
        const container = this.template.querySelector('.article-content');
        // Only set innerHTML if needed to avoid unnecessary re-renders
        if (container && this.articleHtml && container.innerHTML !== this.articleHtml) {
            container.innerHTML = this.articleHtml;
        }
    }
}