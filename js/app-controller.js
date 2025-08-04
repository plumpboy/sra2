import { DOM } from './dom.js';
import { Storage } from './storage.js';
import { AuthManager } from './auth-manager.js';
import { ApiService } from './api-service.js';
import { Utils } from './utils.js';
import { AttendanceAnalyzer } from './attendance-analyzer.js';
import { TimeCalculator } from './time-calculator.js';
import { UIManager } from './ui-manager.js';
import { AttendanceLogger } from './attendance-logger.js';
import { RequestLimitManager } from './request-limit-manager.js';
import { ChromeAPI } from './chrome-api.js';
import { CONSTANTS } from './constants.js';

// Main Application Controller
export class AppController {
  constructor() {
    this.datesToLog = [];
  }

  async initialize() {
    DOM.init();
    this.updateReportDate();
    await this.setupEventListeners();
    await this.calculateTime();
  }

  updateReportDate() {
    const today = new Date();
    const dayOfMonth = today.getDate();
    
    let reportDate;
    if (dayOfMonth === 23) {
      // If day of month is 23, use 21st of current month
      reportDate = new Date(today.getFullYear(), today.getMonth(), 21);
    } else {
      // Otherwise use yesterday
      reportDate = new Date(today);
      reportDate.setDate(today.getDate() - 1);
    }
    
    // Format date as dd-mm-yyyy
    const day = String(reportDate.getDate()).padStart(2, '0');
    const month = String(reportDate.getMonth() + 1).padStart(2, '0');
    const year = reportDate.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;
    
    // Update the span element
    const reportDateElement = DOM.get('reportDateValue');
    if (reportDateElement) {
      reportDateElement.textContent = formattedDate;
    }
  }

  async setupEventListeners() {
    // Calculate time button
    DOM.get('calculateTime')?.addEventListener('click', () => this.calculateTime());

    // Go to Zoho button
    DOM.get('goTozoho')?.addEventListener('click', () => this.goToZoho());

    // Auto log attendance button
    DOM.get('autoLogAttendance')?.addEventListener('click', () => this.autoLogAttendance());

    // Manual log attendance button
    DOM.get('manualLogAttendance')?.addEventListener('click', () => this.manualLogAttendance());

    // Modal buttons
    DOM.get('modalCancel')?.addEventListener('click', () => UIManager.hideConfirmationModal());
    DOM.get('modalCancelManual')?.addEventListener('click', () => UIManager.hideConfirmationModalManual());

    DOM.get('modalConfirm')?.addEventListener('click', async () => {
      UIManager.hideConfirmationModal();
      UIManager.showMessage('Logging Attendance...', 'success');

      if (this.datesToLog.length > 0) {
        const result = await AttendanceLogger.logAttendanceForDates(this.datesToLog);

        if (result.success) {
          UIManager.showMessage('Attendance logged successfully! Refreshing...', 'success');
          setTimeout(() => window.location.reload(), CONSTANTS.REFRESH_DELAY);
        } else {
          UIManager.showMessage('Failed to log Attendance. Please try again.', 'error');
        }
      }
    });
  }

  async calculateTime() {
    try {
      const { hrId, csrfToken, userId } = await AuthManager.getCredentials();

      // Get attendance list
      const attendanceData = await ApiService.getAttendanceList(hrId, csrfToken);

      // Get date range
      const { fromDate, toDate } = Utils.getDateRange();

      // Get attendance info
      const data1 = await ApiService.getAttendanceInfo(hrId, csrfToken, fromDate, toDate, userId);
      console.log('data1', data1)
      await Storage.set({ data1 });

      // Get request data
      const data2 = await ApiService.getMyRequests(hrId, csrfToken, fromDate, toDate, userId);

      await Storage.set({ data2 });

      // Calculate statistics
      const lateDaysBelow6h = AttendanceAnalyzer.countEntriesBelow6h(data1?.regDetails);
      const lateDaysFrom6hTo8h = AttendanceAnalyzer.countEntriesFrom6hTo8h(data1?.regDetails);
      const requestDays = data2?.list.filter(item => item.status != 2 && item.status!= 0);
      const totalRequestDays = requestDays?.length || 0;

      // Get top 3 minimum dates
      const top3MinDatesByTotalHrs = AttendanceAnalyzer.getTop3MinDatesByTotalHrs(data1, requestDays);
      await Storage.set({ top3MinDatesByTotalHrs });

      // Update UI
      UIManager.showMainInterface();
      UIManager.updateDisplayValues(lateDaysBelow6h, lateDaysFrom6hTo8h, totalRequestDays);

      // Check request limit
      await RequestLimitManager.checkAndHandleRequestLimit();

      // Calculate and display current time
      const todayData = Object.values(attendanceData.dayList).find(day => day.isToday === true);

      if (todayData?.filo?.ftime) {
        const result = TimeCalculator.calculateTimeDifference(todayData.filo.ftime);
        UIManager.updateTimeDisplay(result);
      } else {
        DOM.setText('result', 'Time not found');
      }

    } catch (error) {
      console.error('Error calculating time:', error);
      await this.showGotoZohoSection();
    }
  }

  async goToZoho() {
    const activeTab = await ChromeAPI.getActiveTab();
    await ChromeAPI.updateTab(activeTab.id, 'https://accounts.zoho.com/signin?servicename=zohopeople&signupurl=https://www.zoho.com/people/signup.html');
    window.close();
  }

  async autoLogAttendance() {
    const autoLogButton = DOM.get('autoLogAttendance');
    if (autoLogButton?.disabled) return;

    const limitReached = await RequestLimitManager.checkAndHandleRequestLimit();
    if (limitReached) return;

    try {
      const data1 = await Storage.get('data1');
      if (!data1) {
        console.log('No attendance data available. Please calculate time first.');
        return;
      }

      const data2 = await Storage.get('data2');
      const requestDays = data2?.list || [];

      const datesToLog = AttendanceAnalyzer.getTop3MinDatesByTotalHrs(data1, requestDays);

      if (datesToLog.length === 0) {
        UIManager.showMessage('No dates to log Attendance for', 'error');
        return;
      }

      this.datesToLog = datesToLog;
      UIManager.showConfirmationModal(datesToLog, data1);

    } catch (error) {
      console.error('Error in auto log Attendance:', error);
    }
  }

  async manualLogAttendance() {
    const manualLogButton = DOM.get('manualLogAttendance');
    if (manualLogButton?.disabled) return;

    const limitReached = await RequestLimitManager.checkAndHandleRequestLimit();
    if (limitReached) return;

    try {
      const data1 = await Storage.get('data1');
      if (!data1) {
        console.log('No attendance data available. Please calculate time first.');
        return;
      }

      const data2 = await Storage.get('data2');
      const requestDays = data2?.list || [];
      console.log('data2', data2)
      const daysBelow8h = AttendanceAnalyzer.getDaysBelow8h(data1, requestDays);

      if (daysBelow8h.length === 0) {
        UIManager.showMessage('No days with less than 8 hours found.', 'error');
        return;
      }

      UIManager.showConfirmationModalManual(
        daysBelow8h.map(day => day.date),
        data1,
        AttendanceLogger.logAttendanceForDates.bind(AttendanceLogger)
      );

    } catch (error) {
      console.error('Error in manualLogAttendance:', error);
    }
  }

  async showGotoZohoSection() {
    UIManager.showConfigInterface();
    UIManager.resetDisplayValues();
    await Storage.clear();

    try {
      const activeTab = await ChromeAPI.getActiveTab();
      await ChromeAPI.reloadTab(activeTab.id);
      console.log('Page refreshed due to authentication issues');
    } catch (error) {
      console.error('Error refreshing page:', error);
    }
  }
}
