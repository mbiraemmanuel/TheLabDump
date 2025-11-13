import { LightningElement, api, wire } from 'lwc';
import getDocumentsByUrlNames from '@salesforce/apex/CmsContentService.getDocumentsByUrlNames';
import autoQueryDocuments from '@salesforce/apex/CmsContentService.autoQueryDocuments';
import getDocumentsByPrefix from '@salesforce/apex/CmsContentService.getDocumentsByPrefix';

export default class DocList extends LightningElement {
  _manualSlugs = [];
  _autoQuery = false;
  _usePrefix = false;

  @api productSlug;
  @api autoCategory;
  @api autoEngine;
  @api autoTags;
  @api section;
  @api sectionKey; // For prefix-based queries

  docs = [];
  loading = true;

  @api
  get manualSlugs() {
    return this._manualSlugs;
  }

  set manualSlugs(value) {
    this._manualSlugs = this.normalizeSlugs(value);
    if (!this.autoQuery && !this.usePrefix) {
      this.loading = this._manualSlugs.length > 0;
      if (this._manualSlugs.length === 0) {
        this.docs = [];
      }
    }
  }

  @api
  get autoQuery() {
    return this._autoQuery;
  }

  set autoQuery(value) {
    this._autoQuery = this.normalizeBoolean(value);
    if (this._autoQuery) {
      this.loading = true;
    }
  }

  @api
  get usePrefix() {
    return this._usePrefix;
  }

  set usePrefix(value) {
    this._usePrefix = this.normalizeBoolean(value);
    if (this._usePrefix) {
      this.loading = true;
    }
  }

  get hasManualSlugs() {
    return Array.isArray(this.manualSlugs) && this.manualSlugs.length > 0;
  }

  get slugPrefix() {
    return this.sectionKey ? `${this.sectionKey}-` : '';
  }

  @wire(getDocumentsByUrlNames, { urlNames: '$manualSlugs' })
  wiredManual({ data, error }) {
    if (this.autoQuery || this.usePrefix || !this.hasManualSlugs) {
      return;
    }

    if (data) {
      this.docs = this.orderBySlugs(data, this.manualSlugs);
      this.loading = false;
      return;
    }

    if (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      this.docs = [];
      this.loading = false;
      return;
    }

    this.loading = true;
  }

  @wire(autoQueryDocuments, {
    productSlug: '$productSlug',
    category: '$autoCategory',
    engine: '$autoEngine',
    tagsCsv: '$autoTags'
  })
  wiredAuto({ data, error }) {
    if (!this.autoQuery || this.usePrefix) {
      return;
    }

    if (data) {
      this.docs = data;
      this.loading = false;
      return;
    }

    if (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      this.docs = [];
      this.loading = false;
      return;
    }

    this.loading = true;
  }

  @wire(getDocumentsByPrefix, { slugPrefix: '$slugPrefix' })
  wiredPrefix({ data, error }) {
    if (!this.usePrefix || !this.sectionKey) {
      return;
    }

    if (data) {
      this.docs = data;
      this.loading = false;
      return;
    }

    if (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      this.docs = [];
      this.loading = false;
      return;
    }

    this.loading = true;
  }

  orderBySlugs(data, slugs) {
    const lookup = new Map(data.map((doc) => [doc.urlName, doc]));
    return slugs.map((slug) => lookup.get(slug)).filter(Boolean);
  }

  normalizeSlugs(value) {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value.filter(Boolean);
    }

    return String(value)
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  normalizeBoolean(value) {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  }
}
