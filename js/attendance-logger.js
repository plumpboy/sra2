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
  }
};
