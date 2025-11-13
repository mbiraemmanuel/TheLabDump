import { LightningElement, api } from 'lwc';
import basePath from '@salesforce/community/basePath';
import LOCALE from '@salesforce/i18n/lang';

const ROUTE_SEGMENT = 'cms-document';

export default class DocButton extends LightningElement {
  @api doc;
  @api useDetailPage = false;
  @api openInNewTab = false;

  get label() {
    return this.doc?.title || this.doc?.urlName || 'Open';
  }

  get detailHref() {
    if (!this.doc?.urlName || !this.doc?.contentKey) {
      return null;
    }
    const langParam = (LOCALE || 'en-US').replace('-', '_');
    return `${basePath}${ROUTE_SEGMENT}/${this.doc.urlName}-${this.doc.contentKey}?language=${langParam}`;
  }

  get href() {
    if (this.useDetailPage && this.detailHref) {
      return this.detailHref;
    }
    return this.doc?.fileUrl || null;
  }

  get disabled() {
    return !this.href;
  }

  get target() {
    return this.openInNewTab ? '_blank' : '_self';
  }
}
