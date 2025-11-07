import { LightningElement, api } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import pdfjsRes from '@salesforce/resourceUrl/pdfjs_311174';

export default class SimpleCmsPdfViewer extends LightningElement {
  @api managedContent;
  @api fallbackContentKey;
  @api defaultLanguage = 'en_US';

  _loaded = false;
  isLoading = true;
  error;
  documentTitle = 'document';
  pdfDocument = null;
  currentPage = 0;
  totalPages = 0;
  initialPagesToLoad = 2;

  renderedCallback() {
    if (this._loaded) return;
    this._loaded = true;
    this.init();
  }

  async init() {
    console.log('=== PDF Viewer Init Started ===');
    console.log('Resource URL:', pdfjsRes);
    
    try {
      // Check if PDF.js is already loaded globally
      if (window.pdfjsLib) {
        console.log('✓ PDF.js already loaded globally');
        const workerSrc = `${pdfjsRes}/pdf.worker.min.js`;
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
        await this.loadPdf();
        return;
      }

      // WORKAROUND: Load PDF.js by creating script element directly
      // This bypasses LWC security restrictions that prevent UMD global assignment
      const pdfScriptUrl = `${pdfjsRes}/pdf.min.js`;
      console.log('Attempting to load PDF.js from:', pdfScriptUrl);
      
      // Create a promise to wait for script load
      const scriptLoaded = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = pdfScriptUrl;
        script.async = true;
        
        script.onload = () => {
          console.log('✓ Script element loaded');
          resolve();
        };
        
        script.onerror = (err) => {
          console.error('✗ Script element failed to load:', err);
          reject(err);
        };
        
        // Append to document head
        document.head.appendChild(script);
      });
      
      await scriptLoaded;
      
      // Give it a moment to execute and expose globals
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Checking PDF.js in multiple locations...');
      console.log('window.pdfjsLib:', window.pdfjsLib);
      console.log('globalThis.pdfjsLib:', globalThis.pdfjsLib);
      console.log('window["pdfjs-dist/build/pdf"]:', window['pdfjs-dist/build/pdf']);
      console.log('globalThis["pdfjs-dist/build/pdf"]:', globalThis['pdfjs-dist/build/pdf']);
      
      // Try to find PDF.js library in different locations (UMD can expose via different paths)
      const pdfjsLib = window.pdfjsLib || 
                      globalThis.pdfjsLib || 
                      window['pdfjs-dist/build/pdf'] || 
                      globalThis['pdfjs-dist/build/pdf'];
      
      if (!pdfjsLib) {
        console.error('PDF.js not found. Sampling keys...');
        console.log('Sample window keys:', Object.keys(window).slice(0, 30));
        console.log('Sample globalThis keys:', Object.keys(globalThis).slice(0, 30));
        throw new Error('PDF.js library not accessible. The UMD build may be blocked by Lightning Locker Service security. Consider using a different deployment approach.');
      }

      console.log('✓ Found PDF.js library!');
      
      // Store reference on window for easier access
      window.pdfjsLib = pdfjsLib;
      
      // Set worker path
      const workerSrc = `${pdfjsRes}/pdf.worker.min.js`;
      console.log('Setting worker source:', workerSrc);
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

      // Continue with PDF fetch and render
      console.log('Starting PDF load...');
      await this.loadPdf();
    } catch (e) {
      console.error('Error in init:', e);
      this.error = this._msg(e);
      this.isLoading = false;
    }
  }

  async loadPdf() {
    try {
      const key = this.getContentKey();
      if (!key) throw new Error('Content key not found');

      // Fetch document metadata to get title
      try {
        const metadataUrl = `/services/data/v62.0/connect/cms/delivery/contents/${key}`;
        const metaResp = await fetch(metadataUrl, { 
          credentials: 'same-origin',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (metaResp.ok) {
          const metadata = await metaResp.json();
          this.documentTitle = metadata.title || metadata.name || 'document';
          console.log('Document title:', this.documentTitle);
        }
      } catch (metaError) {
        console.warn('Could not fetch document metadata:', metaError);
        // Continue without title - not critical
      }

      // Fetch the actual PDF content
      const url = `/sfsites/c/cms/delivery/media/${key}?language=${this.defaultLanguage}`;
      const resp = await fetch(url, { credentials: 'same-origin' });
      if (!resp.ok) throw new Error(`Failed to fetch PDF (${resp.status})`);
      const buf = await resp.arrayBuffer();

      await this.renderPdf(buf);
    } catch (e) {
      this.error = this._msg(e);
    } finally {
      this.isLoading = false;
    }
  }

  async renderPdf(arrayBuffer) {
    const container = this.template.querySelector('.pdf-container');
    container.innerHTML = '';
    
    // Store arrayBuffer for download
    this.pdfArrayBuffer = arrayBuffer;
    
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    this.pdfDocument = pdf;
    this.totalPages = pdf.numPages;

    // Use device pixel ratio for better quality on high-DPI displays
    const pixelRatio = window.devicePixelRatio || 1;
    const scale = 1.5; // Base scale for good quality

    // Render only the first 2 pages initially
    const pagesToRender = Math.min(this.initialPagesToLoad, pdf.numPages);
    
    for (let i = 1; i <= pagesToRender; i++) {
      await this.renderPage(i, container, scale, pixelRatio);
      this.currentPage = i;
    }

    // Set up scroll listener for lazy loading remaining pages
    if (pdf.numPages > this.initialPagesToLoad) {
      this.setupScrollListener(container, scale, pixelRatio);
    }
  }

  async renderPage(pageNum, container, scale, pixelRatio) {
    const page = await this.pdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale: scale * pixelRatio });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    
    // Set actual canvas size for high resolution
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Scale down display size
    canvas.style.width = `${viewport.width / pixelRatio}px`;
    canvas.style.height = `${viewport.height / pixelRatio}px`;
    canvas.style.display = 'block';
    canvas.style.marginBottom = '10px';
    canvas.dataset.page = pageNum;
    
    await page.render({ 
      canvasContext: ctx, 
      viewport,
      intent: 'print' // Use print rendering intent for better quality
    }).promise;
    
    container.appendChild(canvas);
  }

  setupScrollListener(container, scale, pixelRatio) {
    const scrollHandler = async () => {
      // Check if user scrolled near bottom
      const scrollPosition = container.scrollTop + container.clientHeight;
      const scrollThreshold = container.scrollHeight - 500; // Load more when 500px from bottom

      if (scrollPosition >= scrollThreshold && this.currentPage < this.totalPages) {
        // Load next page
        const nextPage = this.currentPage + 1;
        await this.renderPage(nextPage, container, scale, pixelRatio);
        this.currentPage = nextPage;
      }
    };

    container.addEventListener('scroll', scrollHandler);
  }

  handleDownload() {
    if (!this.pdfArrayBuffer) {
      console.error('No PDF data available for download');
      return;
    }

    try {
      // Create blob and download link
      const blob = new Blob([this.pdfArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Use document title, sanitize it for filename
      const sanitizedTitle = this.documentTitle
        .replace(/[^a-z0-9]/gi, '_')  // Replace special chars with underscore
        .replace(/_+/g, '_')           // Replace multiple underscores with single
        .replace(/^_|_$/g, '');        // Remove leading/trailing underscores
      
      link.download = `${sanitizedTitle}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed:', e);
      this.error = 'Failed to download PDF';
    }
  }

  getContentKey() {
    if (typeof this.managedContent === 'string' && this.managedContent) return this.managedContent;
    if (this.fallbackContentKey) return this.fallbackContentKey;
    const path = window.location.pathname || '';
    const i = path.indexOf('/cms-document/');
    if (i >= 0) {
      const tail = path.substring(i + 14).replace(/\/+$/, '');
      const j = tail.lastIndexOf('-');
      return j > -1 ? tail.substring(j + 1) : tail;
    }
    return null;
  }

  _msg(e) {
    if (!e) return 'Unknown error';
    if (typeof e === 'string') return e;
    if (e.body?.message) return e.body.message;
    return e.message || JSON.stringify(e);
  }
}
