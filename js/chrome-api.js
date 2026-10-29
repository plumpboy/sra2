// Chrome Extension API Wrapper
export const ChromeAPI = {
  async getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  },

  async queryTabs(url) {
    return await chrome.tabs.query({ url });
  },

  // Firefox may not grant manifest host_permissions at install, without them Zoho calls
  // only work through activeTab, i.e. when the popup is opened on a Zoho tab
  async hasHostPermissions() {
    return await chrome.permissions.contains({ origins: chrome.runtime.getManifest().host_permissions });
  },

  // Must be called from a user gesture
  async requestHostPermissions() {
    return await chrome.permissions.request({ origins: chrome.runtime.getManifest().host_permissions });
  },

  async getCookie(url, name) {
    return new Promise((resolve) => {
      chrome.cookies.get({ url, name }, resolve);
    });
  },

  async executeScript(tabId, func) {
    return new Promise((resolve) => {
      chrome.scripting.executeScript(
        { target: { tabId }, func },
        (results) => resolve(results?.[0]?.result)
      );
    });
  },

  async updateTab(tabId, url) {
    return await chrome.tabs.update(tabId, { url });
  },

  async reloadTab(tabId) {
    return await chrome.tabs.reload(tabId);
  }
};
