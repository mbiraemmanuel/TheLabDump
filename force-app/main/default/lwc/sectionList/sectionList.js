import { LightningElement, api, wire } from 'lwc';
import getSections from '@salesforce/apex/CmsContentService.getSections';

export default class SectionList extends LightningElement {
  @api productSlug;
  @api group;

  sections = [];
  loading = true;

  @wire(getSections, { productSlug: '$productSlug', groupName: '$group' })
  wiredSections({ data, error }) {
    console.log('sectionList wire fired:', { productSlug: this.productSlug, group: this.group, data, error });
    
    if (data) {
      this.sections = [...data].sort((a, b) => this.toInt(a.Order) - this.toInt(b.Order));
      this.loading = false;
      console.log('Sections loaded:', this.sections.length);
      return;
    }

    if (error) {
      // Surface the error for debugging without interrupting the page.
      // eslint-disable-next-line no-console
      console.error('Error loading sections:', error);
      this.sections = [];
      this.loading = false;
      return;
    }

    this.loading = true;
  }

  toInt(value) {
    if (!value && value !== 0) {
      return 0;
    }
    const sanitized = String(value).replace(/[^\d-]/g, '');
    return sanitized ? parseInt(sanitized, 10) : 0;
  }
}
