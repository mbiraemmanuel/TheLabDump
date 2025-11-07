// cmsPdfViewer.js
import { LightningElement, api, track } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import getPdfUrlByContentKey from '@salesforce/apex/CmsPdfController.getPdfUrlByContentKey';
import pdfjsRes from '@salesforce/resourceUrl/pdfjs_311174';

export default class CmsPdfViewer extends LightningElement {
  @api managedContent; @api fallbackContentKey; @api defaultLanguage = 'en_US';
  @track isLoading = true; @track error;

  async connectedCallback() {
    try {
      await loadScript(this, `${pdfjsRes}/pdf.min.js`);
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${pdfjsRes}/pdf.worker.min.js`;
      await this.loadAndRender();
    } catch (e) {
      this.error = 'Failed to load PDF.js';
      this.isLoading = false;
    }
  }

  async loadAndRender() {
    try {
      const key = this.computeContentKey();
      if (!key) throw new Error('Could not determine CMS content key.');
      const url = await getPdfUrlByContentKey({ contentKey: key, language: this.defaultLanguage });

      const resp = await fetch(url, { credentials: 'same-origin' });   // no download
      if (!resp.ok) throw new Error(`Fetch failed (${resp.status})`);
      const buffer = await resp.arrayBuffer();

      const container = this.template.querySelector('.pdf-container');
      container.innerHTML = '';
      const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;

      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale: 1.25 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false });
        canvas.width = viewport.width; canvas.height = viewport.height;
        canvas.style.width = '100%'; canvas.style.display = 'block';
        await page.render({ canvasContext: ctx, viewport }).promise;
        container.appendChild(canvas);
      }
    } catch (e) {
      this.error = (e && (e.body?.message || e.message)) || 'Unknown error';
    } finally {
      this.isLoading = false;
    }
  }

  computeContentKey() {
    if (this.managedContent) return this.managedContent;
    if (this.fallbackContentKey) return this.fallbackContentKey;
    const path = window.location.pathname || '';
    const idx = path.indexOf('/cms-document/');
    if (idx >= 0) {
      const tail = path.substring(idx + 14).replace(/\/+$/, '');
      const lastDash = tail.lastIndexOf('-');
      return lastDash > -1 ? tail.substring(lastDash + 1) : tail;
    }
    return null;
  }
}
