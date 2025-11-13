import { LightningElement, api } from 'lwc';

export default class TabBar extends LightningElement {
  _activeTab = 'resources';

  tabs = [
    { id: 'resources', label: 'Product Resources' },
    { id: 'hardware', label: 'Hardware Info' },
    { id: 'releases', label: 'Product Releases' },
    { id: 'notes', label: 'Release Notes' }
  ];

  @api
  get activeTab() {
    return this._activeTab;
  }

  set activeTab(value) {
    this._activeTab = (value || 'resources').toLowerCase();
  }

  get normalizedTabs() {
    return this.tabs.map((tab) => {
      const isActive = tab.id === this.activeTab;
      return {
        ...tab,
        className: `tab${isActive ? ' tab--active' : ''}`,
        ariaCurrent: isActive ? 'page' : 'false'
      };
    });
  }

  handleClick(event) {
    const { id } = event.currentTarget.dataset;
    if (!id) {
      return;
    }
    this.activeTab = id;
    this.dispatchEvent(new CustomEvent('change', { detail: id }));
  }
}
