// DOM Elements Cache and Management
export const DOM = {
  elements: {},

  init() {
    const selectors = {
      calculateTime: '#calculateTime',
      goTozoho: '#goTozoho',
      autoLogAttendance: '#autoLogAttendance',
      manualLogAttendance: '#manualLogAttendance',
      goToZohoSection: '#goToZohoSection',
      mainTable: '.main-table',
      autoLog: '.auto-log',
      errorMessage: '#errorMessage',
      successMessage: '#successMessage',
      daysBelow6h: '#daysBelow6h',
      days6hTo8h: '#days6hTo8h',
      requestedDays: '#requestedDays',
      result: '#result',
      startTime: '#start-time',
      endTime: '#end-time',
      reportDateValue: '#reportDateValue',
      confirmationModal: '#confirmationModal',
      modalSummary: '#modalSummary',
      modalTableBody: '#modalTableBody',
      modalCancel: '#modalCancel',
      modalConfirm: '#modalConfirm',
      confirmationModalManual: '#confirmationModalManual',
      modalSummaryManual: '#modalSummaryManual',
      modalTableBodyManual: '#modalTableBodyManual',
      modalCancelManual: '#modalCancelManual'
    };

    Object.entries(selectors).forEach(([key, selector]) => {
      this.elements[key] = document.querySelector(selector);
    });
  },

  get(id) {
    return this.elements[id];
  },

  setText(id, text) {
    const element = this.get(id);
    if (element) element.textContent = text;
  },

  setDisplay(id, display) {
    const element = this.get(id);
    if (element) element.style.display = display;
  }
};
