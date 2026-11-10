import { AuthManager } from './auth-manager.js';
import { ChromeAPI } from './chrome-api.js';

const REQUEST_HEADERS = {
  'Accept': '*/*',
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'X-Requested-With': 'XMLHttpRequest'
};

// Runs inside the Zoho People page, so it must be self contained
async function zohoFetch(url, params) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: new URLSearchParams(params),
      credentials: 'include'
    });
    return { data: await response.json() };
  } catch (error) {
    return { error: String(error) };
  }
}

// API Service for Zoho People interactions
export const ApiService = {
  // Zoho sets CSRF_TOKEN as a partitioned cookie, which the browser only sends with requests made
  // from a people.zoho.com page, never with the extension's own requests (Zoho then answers
  // INVALID_CSRF_TOKEN). So requests run inside an open Zoho People tab when there is one.
  async makeRequest(url, params, credentials = true) {
    const zohoTab = credentials ? await AuthManager.findZohoTab() : null;
    if (zohoTab) {
      const result = await ChromeAPI.executeScript(zohoTab.id, zohoFetch, [url, params]);
      if (!result) throw new Error('Request through the Zoho People tab failed');
      if (result.error) throw new Error(result.error);
      return this.checkResponse(result.data);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: REQUEST_HEADERS,
      body: new URLSearchParams(params),
      credentials: credentials ? 'include' : 'omit'
    });

    return this.checkResponse(await response.json());
  },

  checkResponse(data) {
    // Zoho answers a bad or expired token with a 400 error body, not data; fail here so callers
    // show the Go to Zoho screen instead of crashing on the missing fields
    if (data?.code === 'INVALID_CSRF_TOKEN') {
      throw new Error('Zoho rejected the CSRF token (INVALID_CSRF_TOKEN)');
    }
    return data;
  },

  async getAttendanceList(hrId, csrfToken) {
    return await this.makeRequest(
      `https://people.zoho.com/${hrId}/AttendanceViewAction.zp`,
      {
        mode: 'getAttList',
        conreqcsr: csrfToken,
        loadToday: false,
        view: 'week',
        preMonth: 0,
        weekStarts: 1
      }
    );
  },

  async getAttendanceInfo(hrId, csrfToken, fromDate, toDate, userId) {
    return await this.makeRequest(
      `https://people.zoho.com/${hrId}/AttendanceAction.zp`,
      {
        mode: 'getAttFiloInfo',
        conreqcsr: csrfToken,
        isAddRegRequest: true,
        fromDate,
        toDate,
        erecno: userId
      }
    );
  },

  async getMyRequests(hrId, csrfToken, fromDate, toDate, userId) {
    return await this.makeRequest(
      `https://people.zoho.com/${hrId}/AttendanceAction.zp`,
      {
        mode: 'getMyRequest',
        conreqcsr: csrfToken,
        sDate: fromDate,
        eDate: toDate,
        erecno: JSON.stringify([userId])
      }
    );
  },

  async getLeaveApplications(hrId, csrfToken, fromDate, toDate, userId) {
    return await this.makeRequest(
      `https://people.zoho.com/${hrId}/leave_view_actions.zp`,
      {
        key: 'applications_view',
        conreqcsr: csrfToken,
        viewMode: 1,
        from: fromDate,
        to: toDate,
        typeofleave: -1, // all leave types
        employee: JSON.stringify([userId]),
        status: 20, // all statuses
        sortType: 1,
        sortBy: 3,
        sIndx: 1,
        limit: 100
      }
    );
  },

  async logAttendance(hrId, csrfToken, date, userId) {
    return await this.makeRequest(
      `https://people.zoho.com/${hrId}/AttendanceAction.zp`,
      {
        mode: 'bulkAttendReg',
        conreqcsr: csrfToken,
        fdate: date,
        dataObj: JSON.stringify({
          [date]: {
            fromDate: date,
            toDate: date,
            ftime: 540,  // 9:00 AM in minutes
            ttime: 1095  // 6:00 PM in minutes
          }
        }),
        erecno: userId
      }
    );
  },

  async getLeaveTypes(hrId, csrfToken, userId) {
    return await this.makeRequest(
      `https://people.zoho.com/${hrId}/leave_common_action.zp`,
      {
        key: 'leavetype_appl',
        employee: userId,
        isView: false,
        conreqcsr: csrfToken
      }
    );
  },

  async applyLeave(hrId, csrfToken, userId, loginUserZUID, leaveData) {
    // leaveData: { leaveTypeId, date, reason, duration, period }
    // duration: 'full' | 'half' | 'quarter'
    // period: '1st_half' | '2nd_half' | '1st_quarter' | '2nd_quarter' | '3rd_quarter' | '4th_quarter'

    // Calculate days taken and session based on duration/period
    let daysTaken = 1;
    let session = 0; // 0 = full day

    if (leaveData.duration === 'half') {
      daysTaken = 0.5;
      session = leaveData.period === '1st_half' ? 1 : 2; // 1 = 1st half, 2 = 2nd half
    } else if (leaveData.duration === 'quarter') {
      daysTaken = 0.25;
      // 1 = 1st quarter, 2 = 2nd quarter, 3 = 3rd quarter, 4 = 4th quarter
      const quarterMap = {
        '1st_quarter': 1,
        '2nd_quarter': 2,
        '3rd_quarter': 3,
        '4th_quarter': 4
      };
      session = quarterMap[leaveData.period] || 1;
    }

    const dateSessionData = JSON.stringify({
      count: daysTaken,
      session: session
    });

    return await this.makeRequest(
      `https://people.zoho.com/${hrId}/addUpdateRecord.zp`,
      {
        isPicklistIdEnabled: true,
        Employee_ID: userId,
        Leavetype: leaveData.leaveTypeId,
        From: leaveData.date,
        To: leaveData.date,
        bereavement_leave_type: '',
        Reasonforleave: leaveData.reason || 'Personal reason',
        zp_tableName: 'P_EmployeeLeave',
        loginUserZUID: loginUserZUID,
        conreqcsr: csrfToken,
        zp_formId: '412762000000035693',
        zp_mode: 'addRecord',
        [leaveData.date]: dateSessionData,
        isHour: false,
        isDayBased: true,
        Daystaken: daysTaken,
        isDraft: false
      }
    );
  }
};
