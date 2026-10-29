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
    this.autoLogPlan = null;
    this.credentials = null;
  }

  async initialize() {
    DOM.init();
    this.updateReportDate();
    await this.setupEventListeners();

    if (!(await ChromeAPI.hasHostPermissions())) {
      UIManager.showGrantAccessInterface();
      return;
    }
    await this.calculateTime();
    await this.showDonateReminder();
  }

  // Donate reminder pops up on the Home tab once per day
  async showDonateReminder() {
    const today = Utils.formatDateToCustom(new Date());
    if (await Storage.get('donateReminderShownOn') === today) return;

    await Storage.set({ donateReminderShownOn: today });
    UIManager.showDonateModal();
  }

  async grantAccess() {
    // Firefox may close the popup while its permission prompt is shown; reopening it then works from any tab
    const granted = await ChromeAPI.requestHostPermissions();
    if (granted) {
      await this.calculateTime();
    } else {
      UIManager.showMessage('Access to Zoho People is required to use this extension.', 'error');
    }
  }

  updateReportDate() {
    const today = Utils.nowUTC7();
    const dayOfMonth = today.getDate();
    
    let reportDate;
    if (dayOfMonth === 22) {
      // If day of month is 22, use 21st of current month
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

    // Grant host permissions button
    DOM.get('grantAccess')?.addEventListener('click', () => this.grantAccess());

    // Auto log attendance button
    DOM.get('autoLogAttendance')?.addEventListener('click', () => this.autoLogAttendance());

    // Manual log attendance button
    DOM.get('manualLogAttendance')?.addEventListener('click', () => this.manualLogAttendance());

    // Modal buttons
    DOM.get('modalCancel')?.addEventListener('click', () => UIManager.hideConfirmationModal());
    DOM.get('modalCancelManual')?.addEventListener('click', () => UIManager.hideConfirmationModalManual());
    DOM.get('donateModalClose')?.addEventListener('click', () => UIManager.hideDonateModal());

    DOM.get('modalConfirm')?.addEventListener('click', () => this.confirmAutoLog());
  }

  async confirmAutoLog() {
    const plan = this.autoLogPlan;
    if (!plan) return;

    const leaveTypeId = DOM.get('autoLeaveType')?.value;
    if (plan.leaveDays.length > 0 && !leaveTypeId) {
      UIManager.showMessage('Please select a leave type', 'error');
      return;
    }

    UIManager.setButtonState('modalConfirm', true);
    const failures = [];

    if (plan.attendanceDays.length > 0) {
      UIManager.showAutoLogProgress('Logging Attendance...');
      const result = await AttendanceLogger.logAttendanceForDates(plan.attendanceDays.map(day => day.date));
      if (!result.success) failures.push(`Attendance: ${result.error}`);
    }

    for (const day of plan.leaveDays) {
      UIManager.showAutoLogProgress(`Applying leave for ${day.date}...`);
      const result = await AttendanceLogger.applyLeave(this.credentials, {
        leaveTypeId,
        date: day.date,
        duration: day.leave.duration,
        period: day.leave.period
      });
      if (!result.success) failures.push(`${day.date}: ${result.error}`);
    }

    UIManager.hideConfirmationModal();
    if (failures.length === 0) {
      UIManager.showMessage('Attendance and leave submitted successfully! Refreshing...', 'success');
      setTimeout(() => window.location.reload(), CONSTANTS.REFRESH_DELAY);
    } else {
      UIManager.showMessage(`Some requests failed:<br>${failures.join('<br>')}`, 'error', true);
    }
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

      // Leave applications, so days already covered by leave are not suggested again
      const leaves = await this.getLeaveApplications(hrId, csrfToken, fromDate, toDate, userId);
      await Storage.set({ leaves });

      // Calculate statistics
      const lateDaysBelow6h = AttendanceAnalyzer.countEntriesBelow6h(data1?.regDetails);
      const lateDaysFrom6hTo8h = AttendanceAnalyzer.countEntriesFrom6hTo8h(data1?.regDetails);
      console.log(2222222222222, lateDaysBelow6h)
      console.log(33333333333, lateDaysFrom6hTo8h)
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

  async getLeaveApplications(hrId, csrfToken, fromDate, toDate, userId) {
    try {
      const response = await ApiService.getLeaveApplications(hrId, csrfToken, fromDate, toDate, userId);
      return response?.data || [];
    } catch (error) {
      console.error('Failed to load leave applications:', error);
      return [];
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

    try {
      const data1 = await Storage.get('data1');
      if (!data1) {
        console.log('No attendance data available. Please calculate time first.');
        return;
      }

      const data2 = await Storage.get('data2');
      const requestDays = data2?.list || [];
      const leaves = await Storage.get('leaves') || [];

      // Attendance requests go to the costliest days, leave covers the rest with minimum days
      const plan = AttendanceAnalyzer.planLateDays(data1, requestDays, leaves);

      if (plan.attendanceDays.length === 0 && plan.leaveDays.length === 0) {
        const notes = [];
        if (plan.lateDays.length > 0) notes.push(`${plan.lateDays.length} late day(s) will be auto settled to 8h`);
        if (plan.requestedDays.length > 0) notes.push(`${plan.requestedDays.length} day(s) already requested`);
        const message = notes.length > 0 ? `Nothing to do: ${notes.join(', ')}` : 'No dates to log Attendance for';
        UIManager.showMessage(message, notes.length > 0 ? 'success' : 'error');
        return;
      }

      this.autoLogPlan = plan;
      this.credentials = await AuthManager.getCredentials();

      await RequestLimitManager.checkAndHandleRequestLimit();
      UIManager.showConfirmationModal(plan, data1, this.credentials);

    } catch (error) {
      console.error('Error in auto log Attendance:', error);
    }
  }

  async manualLogAttendance() {
    const manualLogButton = DOM.get('manualLogAttendance');
    if (manualLogButton?.disabled) return;

    try {
      const data1 = await Storage.get('data1');
      if (!data1) {
        console.log('No attendance data available. Please calculate time first.');
        return;
      }

      const data2 = await Storage.get('data2');
      const requestDays = data2?.list || [];
      console.log('data2', data2)
      const leaves = await Storage.get('leaves') || [];
      const plan = AttendanceAnalyzer.planLateDays(data1, requestDays, leaves);

      if (plan.attendanceDays.length + plan.leaveDays.length + plan.lateDays.length + plan.requestedDays.length === 0) {
        UIManager.showMessage('No days with less than 8 hours found.', 'error');
        return;
      }

      // Get credentials for leave modal
      const credentials = await AuthManager.getCredentials();

      // Check if limit is reached
      const limitReached = await RequestLimitManager.checkAndHandleRequestLimit();

      UIManager.showConfirmationModalManual(
        plan,
        data1,
        AttendanceLogger.logAttendanceForDates.bind(AttendanceLogger),
        limitReached,
        credentials
      );

    } catch (error) {
      console.error('Error in manualLogAttendance:', error);
    }
  }

  async showGotoZohoSection() {
    UIManager.showConfigInterface();
    UIManager.resetDisplayValues();
    // Keep hrId and userId so the popup keeps working from any tab once logged in again
    await Storage.remove(['data1', 'data2', 'leaves', 'top3MinDatesByTotalHrs', 'csrfToken', 'loginUserZUID']);

    try {
      // Reload Zoho only, never an unrelated page the popup was opened on
      const activeTab = await ChromeAPI.getActiveTab();
      if (activeTab?.url?.startsWith('https://people.zoho.com/')) {
        await ChromeAPI.reloadTab(activeTab.id);
        console.log('Page refreshed due to authentication issues');
      }
    } catch (error) {
      console.error('Error refreshing page:', error);
    }
  }
}
