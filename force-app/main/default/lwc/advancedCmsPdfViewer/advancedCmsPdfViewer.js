import { LightningElement, api } from 'lwc';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
import pdfjsRes from '@salesforce/resourceUrl/pdfjs_311174';

export default class AdvancedCmsPdfViewer extends LightningElement {
  @api managedContent;
  @api fallbackContentKey;
  @api defaultLanguage = 'en_US';

  _loaded = false;
  isLoading = true;
  error;
  documentTitle = 'document';
  pdfUrl = null;

  renderedCallback() {
    if (this._loaded) return;
    this._loaded = true;
    this.init();
  }

  async init() {
    console.log('=== Advanced PDF Viewer Init Started ===');
    
    try {
      // Get content key
      const key = this.getContentKey();
      if (!key) throw new Error('Content key not found');

      // Get PDF URL
      this.pdfUrl = `/sfsites/c/cms/delivery/media/${key}?language=${this.defaultLanguage}`;
      
      // Load PDF.js library
      await this.loadPdfJs();
      
      // Initialize viewer (will extract title from PDF or headers)
      await this.initializeViewer();
      
      this.isLoading = false;
    } catch (e) {
      console.error('Error in init:', e);
      this.error = this._msg(e);
      this.isLoading = false;
    }
  }

  async loadPdfJs() {
    // Create script element directly for better compatibility
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${pdfjsRes}/pdf.min.js`;
      script.async = true;
      
      script.onload = () => {
        console.log('✓ PDF.js loaded');
        
        // Try to find PDF.js library
        const pdfjsLib = window.pdfjsLib || 
                        globalThis.pdfjsLib || 
                        window['pdfjs-dist/build/pdf'] || 
                        globalThis['pdfjs-dist/build/pdf'];
        
        if (pdfjsLib) {
          window.pdfjsLib = pdfjsLib;
          pdfjsLib.GlobalWorkerOptions.workerSrc = `${pdfjsRes}/pdf.worker.min.js`;
          resolve();
        } else {
          reject(new Error('PDF.js library not accessible'));
        }
      };
      
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async initializeViewer() {
    const container = this.template.querySelector('.pdf-viewer-container');
    
    // Fetch the PDF
    const response = await fetch(this.pdfUrl, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`Failed to fetch PDF (${response.status})`);
    
    // Try to extract title from Content-Disposition header
    const contentDisposition = response.headers.get('content-disposition');
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        let filename = filenameMatch[1].replace(/['"]/g, '');
        // Remove .pdf extension if present
        this.documentTitle = filename.replace(/\.pdf$/i, '');
        console.log('✓ Title from Content-Disposition:', this.documentTitle);
      }
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    // Try to get title from PDF metadata
    try {
      const metadata = await pdf.getMetadata();
      if (metadata.info && metadata.info.Title) {
        this.documentTitle = metadata.info.Title;
        console.log('✓ Title from PDF metadata:', this.documentTitle);
      }
    } catch (metaErr) {
      console.warn('Could not extract PDF metadata:', metaErr);
    }
    
    console.log('Final document title:', this.documentTitle);
    
    // Store for download
    this.pdfArrayBuffer = arrayBuffer;
    this.pdfDocument = pdf;
    
    // Create viewer UI
    this.renderViewer(pdf);
  }

  renderViewer(pdf) {
    // Wait for next tick to ensure DOM is ready
    setTimeout(async () => {
      const container = this.template.querySelector('.pdf-canvas-container');
      
      if (!container) {
        console.error('PDF canvas container not found');
        return;
      }
      
      const pixelRatio = window.devicePixelRatio || 1;
      let currentScale = 1.5;

      const renderAllPages = async () => {
        try {
          container.innerHTML = ''; // Clear container
          
          // Render all pages for continuous scroll
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: currentScale * pixelRatio });
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { alpha: false });
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.width = `${viewport.width / pixelRatio}px`;
            canvas.style.height = `${viewport.height / pixelRatio}px`;
            canvas.style.marginBottom = '20px';
            canvas.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.5)';
            canvas.style.borderRadius = '2px';
            
            container.appendChild(canvas);
            
            await page.render({ 
              canvasContext: ctx, 
              viewport,
              intent: 'print'
            }).promise;
          }
        } catch (err) {
          console.error('Error rendering pages:', err);
        }
      };

      // Initial render of all pages
      await renderAllPages();

      // Zoom controls
      const zoomInBtn = this.template.querySelector('.zoom-in');
      const zoomOutBtn = this.template.querySelector('.zoom-out');
      const zoomResetBtn = this.template.querySelector('.zoom-reset');

      if (zoomInBtn) {
        zoomInBtn.onclick = async () => {
          currentScale += 0.25;
          await renderAllPages();
        };
      }

      if (zoomOutBtn) {
        zoomOutBtn.onclick = async () => {
          if (currentScale > 0.5) {
            currentScale -= 0.25;
            await renderAllPages();
          }
        };
      }

      if (zoomResetBtn) {
        zoomResetBtn.onclick = async () => {
          currentScale = 1.5;
          await renderAllPages();
        };
      }
    }, 100);
  }

  handleDownload() {
    if (!this.pdfArrayBuffer) return;

    try {
      console.log('Download initiated with title:', this.documentTitle);
      
      const blob = new Blob([this.pdfArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Keep spaces and hyphens, only remove truly invalid filename characters
      const sanitizedTitle = this.documentTitle
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')  // Remove invalid filename chars
        .replace(/\s+/g, ' ')                    // Normalize multiple spaces to single
        .trim();                                 // Remove leading/trailing spaces
      
      const filename = `${sanitizedTitle}.pdf`;
      console.log('Downloading as:', filename);
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed:', e);
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
