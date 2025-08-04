// Chrome Extension API Wrapper
export const ChromeAPI = {
  async getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
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
