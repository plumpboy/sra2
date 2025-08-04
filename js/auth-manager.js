import { Storage } from './storage.js';
import { ChromeAPI } from './chrome-api.js';

// Authentication Management
export const AuthManager = {
  async getCredentials() {
    const hrId = await Storage.get('hrId');
    const csrfToken = await Storage.get('csrfToken');
    const userId = await Storage.get('userId');

    if (hrId && csrfToken && userId) {
      return { hrId, csrfToken, userId };
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

    const credentials = { csrfToken: cookie.value, hrId, userId };
    await Storage.set(credentials);

    return credentials;
  }
};
