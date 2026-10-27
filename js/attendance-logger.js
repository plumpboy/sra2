import { ApiService } from './api-service.js';
import { Storage } from './storage.js';

// Attendance Logging Operations
export const AttendanceLogger = {
  async logAttendanceForDates(dates) {
    try {
      const hrId = await Storage.get('hrId');
      const csrfToken = await Storage.get('csrfToken');
      const userId = await Storage.get('userId');

      if (!hrId || !csrfToken || !userId) {
        throw new Error('Missing required credentials');
      }

      for (const date of dates) {
        const result = await ApiService.logAttendance(hrId, csrfToken, date, userId);
        console.log(`Attendance logged for ${date}:`, result);
      }

      return { success: true, message: 'Success' };
    } catch (error) {
      console.error('Error logging Attendance:', error);
      return { success: false, error: error.message };
    }
  },

  getLeaveErrorMessage(response) {
    const errorObj = Array.isArray(response) ? response[0] : response;
    const message = errorObj?.message ?? errorObj?.error;
    if (!message) return 'Unknown error';
    return typeof message === 'object' ? Object.values(message).join(', ') : message;
  },

  async applyLeave(credentials, leaveData) {
    try {
      const response = await ApiService.applyLeave(
        credentials.hrId,
        credentials.csrfToken,
        credentials.userId,
        credentials.loginUserZUID,
        leaveData
      );

      // Success is code 7000 - handle both object and array response
      const responseData = Array.isArray(response) ? response[0] : response;
      if (responseData?.code === 7000 || responseData?.pkId || response?.status === 'success') {
        return { success: true };
      }
      return { success: false, error: this.getLeaveErrorMessage(response) };
    } catch (error) {
      console.error('Error applying leave:', error);
      return { success: false, error: error.message };
    }
  }
};
