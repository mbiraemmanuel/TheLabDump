import { LightningElement, wire } from 'lwc';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';

const DEFAULT_TAB = 'resources';
const VALID_TABS = new Set(['resources', 'hardware', 'releases', 'notes']);

export default class ProductHub extends NavigationMixin(LightningElement) {
  tab = DEFAULT_TAB;
  productSlug = 'voiceover-pro';

  @wire(CurrentPageReference)
  parse(currentPageReference) {
    if (!currentPageReference) {
      return;
    }

    console.log('CurrentPageReference:', JSON.stringify(currentPageReference));
    
    // Check URL query parameters first
    const params = currentPageReference.state;
    
    if (params?.c__tab) {
      const normalized = String(params.c__tab).toLowerCase();
      this.tab = VALID_TABS.has(normalized) ? normalized : DEFAULT_TAB;
    } else if (params?.tab) {
      const normalized = String(params.tab).toLowerCase();
      this.tab = VALID_TABS.has(normalized) ? normalized : DEFAULT_TAB;
    }

    if (params?.c__slug) {
      this.productSlug = params.c__slug;
    } else if (params?.slug) {
      this.productSlug = params.slug;
    }

    console.log('Active tab:', this.tab, 'Product slug:', this.productSlug);
  }

  onTabChange(event) {
    this.navigate(event.detail);
  }

  navigate(tab) {
    const normalized = VALID_TABS.has(tab) ? tab : DEFAULT_TAB;
    this[NavigationMixin.Navigate]({
      type: 'standard__webPage',
      attributes: {
        url: `/product/${this.productSlug}?tab=${normalized}`
      }
    });
  }

  get isResources() {
    return this.tab === 'resources';
  }

  get isHardware() {
    return this.tab === 'hardware';
  }

  get isReleases() {
    return this.tab === 'releases';
  }

  get isNotes() {
    return this.tab === 'notes';
  }
}
