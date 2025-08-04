// API Service for Zoho People interactions
export const ApiService = {
  async makeRequest(url, params, credentials = true) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
      body: new URLSearchParams(params),
      credentials: credentials ? 'include' : 'omit'
    });

    return await response.json();
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
  }
};
