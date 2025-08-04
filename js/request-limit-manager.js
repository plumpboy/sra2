import { CONSTANTS } from './constants.js';
import { Storage } from './storage.js';
import { DOM } from './dom.js';
import { UIManager } from './ui-manager.js';

// Request Limit Management
export const RequestLimitManager = {
  async checkAndHandleRequestLimit() {
    try {
      const data2 = await Storage.get('data2');
      const hrId = await Storage.get('hrId');
      const requestDays = data2?.list || [];
      const totalRequestDays = requestDays.filter(item => item.status != 2 && item.status!= 0).length;

      if (totalRequestDays >= CONSTANTS.REQUEST_LIMIT) {
        const message = `You have used up all your attendance requests for this month. <a href="https://people.zoho.com/${hrId}/zp#attendance/entry/regularization" target="_blank">Click here to see detail</a>`;
        UIManager.showMessage(message, 'error', true);

        UIManager.setButtonState('autoLogAttendance', true, 'Attendance requests limit reached');
        UIManager.setButtonState('manualLogAttendance', true, 'Attendance requests limit reached');

        return true;
      } else {
        UIManager.setButtonState('autoLogAttendance', false);
        UIManager.setButtonState('manualLogAttendance', false);

        const errorMessage = DOM.get('errorMessage');
        if (errorMessage) errorMessage.style.display = 'none';

        return false;
      }
    } catch (error) {
      console.error('Error checking request limit:', error);
      return false;
    }
  }
};
