import { Storage } from './storage.js';
import { ChromeAPI } from './chrome-api.js';

// Authentication Management
export const AuthManager = {
  async getCredentials() {
    const hrId = await Storage.get('hrId');
    const csrfToken = await Storage.get('csrfToken');
    const userId = await Storage.get('userId');
    const loginUserZUID = await Storage.get('loginUserZUID');

    if (hrId && csrfToken && userId && loginUserZUID) {
      return { hrId, csrfToken, userId, loginUserZUID };
    }

    return await this.fetchCredentials();
  },

  async fetchCredentials() {
    const activeTab = await ChromeAPI.getActiveTab();
    const url = new URL(activeTab.url);

    // Get CSRF token
    const cookie = await ChromeAPI.getCookie(url.origin, 'CSRF_TOKEN');
    if (!cookie) {
      throw new Error('CSRF token not found');
    }

    // Get loginUserZUID from wms-tkp-token cookie
    const wmsCookie = await ChromeAPI.getCookie(url.origin, 'wms-tkp-token');
    let loginUserZUID = '';
    if (wmsCookie && wmsCookie.value) {
      // wms-tkp-token format: "747369871-af9dcac1-c0b5cd7e3b12a8baa6a7b19f4024bc4f"
      loginUserZUID = wmsCookie.value.split('-')[0];
    }

    // Get HR ID
    const pageUrl = await ChromeAPI.executeScript(activeTab.id, () => window.location.href);
    const hrIdMatch = pageUrl.match(/https:\/\/people\.zoho\.com\/(hrportal\d+)\//);
    const hrId = hrIdMatch ? hrIdMatch[1] : '';

    if (!hrId) {
      throw new Error('HR ID not found');
    }

    // Get User ID
    const userId = await ChromeAPI.executeScript(
      activeTab.id,
      () => document.querySelector('#zpeople_userimage')?.getAttribute('empid')
    );

    if (!userId) {
      throw new Error('User ID not found');
    }

    const credentials = { csrfToken: cookie.value, hrId, userId, loginUserZUID };
    await Storage.set(credentials);

    return credentials;
  }
};
