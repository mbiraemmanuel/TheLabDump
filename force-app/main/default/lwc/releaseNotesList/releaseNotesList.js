import { LightningElement, api, wire } from 'lwc';
import isGuest from '@salesforce/user/isGuest';
import basePath from '@salesforce/community/basePath';
import LOCALE from '@salesforce/i18n/lang';

import getReleases from '@salesforce/apex/CmsContentService.getReleases';
import getDocumentsByUrlNames from '@salesforce/apex/CmsContentService.getDocumentsByUrlNames';

const ROUTE_SEGMENT = 'cms-document';

export default class ReleaseNotesList extends LightningElement {
  @api productSlug;

  releases = [];
  rows = [];
  loading = true;

  docsBySlug = new Map();

  @wire(getReleases, { productSlug: '$productSlug' })
  async wiredReleases({ data, error }) {
    if (data) {
      this.releases = data;
      this.docsBySlug = new Map();

      if (data.length === 0) {
        this.rows = [];
        this.loading = false;
        return;
      }

      const slugs = new Set();

      data.forEach((release) => {
        if (release.ExternalDocSlug) {
          slugs.add(release.ExternalDocSlug);
        }
        if (!isGuest && release.InternalDocSlug) {
          slugs.add(release.InternalDocSlug);
        }
      });

      if (slugs.size === 0) {
        this.rows = this.buildRows();
        this.loading = false;
        return;
      }

      try {
        const docs = await getDocumentsByUrlNames({ urlNames: Array.from(slugs) });
        (docs || []).forEach((doc) => this.docsBySlug.set(doc.urlName, doc));
        this.rows = this.buildRows();
      } catch (fetchError) {
        // eslint-disable-next-line no-console
        console.error(fetchError);
        this.rows = this.buildRows();
      } finally {
        this.loading = false;
      }
      return;
    }

    if (error) {
      this.loading = false;
      // eslint-disable-next-line no-console
      console.error(error);
      this.rows = [];
      return;
    }

    this.loading = true;
  }

  get guest() {
    return isGuest;
  }

  buildRows() {
    const langParam = (LOCALE || 'en-US').replace('-', '_');

    return this.releases.map((release) => {
      const externalDoc = release.ExternalDocSlug ? this.docsBySlug.get(release.ExternalDocSlug) : null;
      const internalDoc = !isGuest && release.InternalDocSlug ? this.docsBySlug.get(release.InternalDocSlug) : null;

      return {
        title: release.Title,
        publishedDate: release.PublishedDate,
        externalHref: externalDoc
          ? `${basePath}${ROUTE_SEGMENT}/${externalDoc.urlName}-${externalDoc.contentKey}?language=${langParam}`
          : null,
        internalHref: internalDoc
          ? `${basePath}${ROUTE_SEGMENT}/${internalDoc.urlName}-${internalDoc.contentKey}?language=${langParam}`
          : null
      };
    });
  }
}
