import { LightningElement, api } from 'lwc';

export default class SectionCard extends LightningElement {
  @api section;

  get hasSubtitle() {
    return Boolean(this.section?.Subtitle);
  }

  get isAuto() {
    const queryFlag = (this.section?.AutoQuery || '').toString().toLowerCase();
    return queryFlag === 'true';
  }

  get usePrefix() {
    // Use prefix mode if:
    // 1. Not using auto-query
    // 2. No manual items provided
    // 3. Has a SectionKey
    const hasManualItems = Boolean(this.section?.ManualItems);
    const hasSectionKey = Boolean(this.section?.SectionKey);
    return !this.isAuto && !hasManualItems && hasSectionKey;
  }

  renderedCallback() {
    if (this.hasSubtitle) {
      const subtitleDiv = this.template.querySelector('.subtitle');
      if (subtitleDiv && this.section?.Subtitle) {
        subtitleDiv.innerHTML = this.section.Subtitle;
      }
    }
  }
}
