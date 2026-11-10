import { Storage } from './storage.js';
import { ChromeAPI } from './chrome-api.js';

const ZOHO_URL = 'https://people.zoho.com';

// Authentication Management
export const AuthManager = {
  // Tokens are read from Zoho cookies on every call, so the popup works from any tab.
  // Only hrId and userId need a Zoho tab, once, and are cached after that.
  async getCredentials() {
    let hrId = await Storage.get('hrId');
    let userId = await Storage.get('userId');
    if (!hrId || !userId) {
      ({ hrId, userId } = await this.fetchUserIds());
    }

    // Get CSRF token, the one the browser sends with requests to this portal
    const cookie = await this.findCsrfCookie(hrId);
    if (!cookie) {
      throw new Error('CSRF token not found');
    }

    // Get loginUserZUID from wms-tkp-token cookie
    const wmsCookie = await ChromeAPI.getCookie(ZOHO_URL, 'wms-tkp-token');
    let loginUserZUID = '';
    if (wmsCookie && wmsCookie.value) {
      // wms-tkp-token format: "747369871-af9dcac1-c0b5cd7e3b12a8baa6a7b19f4024bc4f"
      loginUserZUID = wmsCookie.value.split('-')[0];
    }

    const credentials = { csrfToken: cookie.value, hrId, userId, loginUserZUID };
    await Storage.set(credentials);

    return credentials;
  },

  // Zoho People only accepts its own CSRF_TOKEN as conreqcsr. It is a partitioned cookie the
  // cookies API usually cannot see, so it is read from an open Zoho People page first, then from
  // the cookie for the exact API URL (it may live on /hrportalXXX/ rather than /)
  async findCsrfCookie(hrId) {
    const zohoTab = await this.findZohoTab();
    if (zohoTab) {
      const pageToken = await ChromeAPI.executeScript(
        zohoTab.id,
        () => document.cookie.split('; ').find(c => c.startsWith('CSRF_TOKEN='))?.slice('CSRF_TOKEN='.length)
      );
      if (pageToken) return { value: decodeURIComponent(pageToken) };
    }

    return await ChromeAPI.getCookie(`${ZOHO_URL}/${hrId}/AttendanceAction.zp`, 'CSRF_TOKEN')
      || await ChromeAPI.getCookie(`${ZOHO_URL}/`, 'CSRF_TOKEN');
  },

  // The active tab if it is Zoho People, otherwise any open Zoho People tab
  async findZohoTab() {
    const activeTab = await ChromeAPI.getActiveTab();
    if (activeTab?.url?.startsWith(`${ZOHO_URL}/`)) return activeTab;

    const tabs = await ChromeAPI.queryTabs(`${ZOHO_URL}/*`);
    return tabs[0];
  },

  async fetchUserIds() {
    const zohoTab = await this.findZohoTab();
    if (!zohoTab) {
      throw new Error('No Zoho People tab found');
    }

    // Get HR ID
    const pageUrl = await ChromeAPI.executeScript(zohoTab.id, () => window.location.href);
    const hrIdMatch = pageUrl?.match(/https:\/\/people\.zoho\.com\/(hrportal\d+)\//);
    const hrId = hrIdMatch ? hrIdMatch[1] : '';

    if (!hrId) {
      throw new Error('HR ID not found');
    }

    // Get User ID
    const userId = await ChromeAPI.executeScript(
      zohoTab.id,
      () => document.querySelector('#zpeople_userimage')?.getAttribute('empid')
    );

    if (!userId) {
      throw new Error('User ID not found');
    }

    return { hrId, userId };
  }
};
