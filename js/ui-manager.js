import { CONSTANTS } from './constants.js';
import { DOM } from './dom.js';
import { Utils } from './utils.js';

// UI Management and User Interface Operations
export class UIManager {
  static showMessage(message, type, persistent = false) {
    const successMessage = DOM.get('successMessage');
    const errorMessage = DOM.get('errorMessage');

    if (!successMessage || !errorMessage) {
      console.error('Message elements not found in DOM');
      return;
    }

    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';

    if (type === 'success') {
      successMessage.innerHTML = message;
      successMessage.style.display = 'block';
    } else if (type === 'error') {
      errorMessage.innerHTML = message;
      errorMessage.style.display = 'block';
    }

    if (!persistent) {
      setTimeout(() => {
        if (successMessage && errorMessage) {
          successMessage.style.display = 'none';
          errorMessage.style.display = 'none';
        }
      }, CONSTANTS.MESSAGE_TIMEOUT);
    }
  }

  static updateDisplayValues(lateDaysBelow6h, lateDaysFrom6hTo8h, totalRequestDays) {
    DOM.setText('daysBelow6h', lateDaysBelow6h);
    DOM.setText('days6hTo8h', lateDaysFrom6hTo8h);
    DOM.setText('requestedDays', totalRequestDays);
    
    // Show month transition note for dates 21-22
    this.updateMonthTransitionNote();
  }

  static updateMonthTransitionNote() {
    const currentDate = new Date();
    const dayOfMonth = currentDate.getDate();
    
    if (dayOfMonth === 21 || dayOfMonth === 22) {
      DOM.setDisplay('monthTransitionNote', 'block');
    } else {
      DOM.setDisplay('monthTransitionNote', 'none');
    }
  }

  static updateTimeDisplay(result) {
    DOM.setText('result', result[0]);
    DOM.setText('startTime', result[1]);
    DOM.setText('endTime', result[2]);
  }

  static resetDisplayValues() {
    const defaultValues = ['--', '--', '--', '--', '--', '--'];
    const elements = ['daysBelow6h', 'days6hTo8h', 'requestedDays', 'result', 'startTime', 'endTime'];

    elements.forEach((element, index) => {
      DOM.setText(element, defaultValues[index]);
    });
  }

  static showMainInterface() {
    DOM.setDisplay('goToZohoSection', 'none');
    DOM.setDisplay('mainTable', 'table');
    DOM.setDisplay('autoLog', 'block');
  }

  static showConfigInterface() {
    DOM.setDisplay('goToZohoSection', 'block');
    DOM.setDisplay('mainTable', 'none');
    DOM.setDisplay('autoLog', 'none');
  }

  static setButtonState(buttonId, disabled, title = '') {
    const button = DOM.get(buttonId);
    if (button) {
      button.disabled = disabled;
      button.style.opacity = disabled ? '0.5' : '1';
      button.style.cursor = disabled ? 'not-allowed' : 'pointer';
      button.title = title;
    }
  }

  static showConfirmationModal(datesToLog, data1, limitReached = false) {
    const modal = DOM.get('confirmationModal');
    const summary = DOM.get('modalSummary');
    const tableBody = DOM.get('modalTableBody');
    const confirmButton = DOM.get('modalConfirm');

    if (!modal || !summary || !tableBody) return;

    if (limitReached) {
      summary.innerHTML = `<span style="color: #e74c3c; font-weight: bold;">⚠️ You've reached your request limit for this month</span><br><br>You are about to log Attendance for ${datesToLog.length} date(s):`;
      this.setButtonState('modalConfirm', true, 'Request limit reached');
    } else {
      summary.textContent = `You are about to log Attendance for ${datesToLog.length} date(s):`;
      this.setButtonState('modalConfirm', false);
    }

    tableBody.innerHTML = '';

    datesToLog.forEach(date => {
      const row = document.createElement('tr');
      const currentHours = data1.regDetails[date]?.totalhrs || 0;
      const formattedCurrentHours = Utils.formatSecondsToHoursMinutes(currentHours);

      row.innerHTML = `
        <td>${date}</td>
        <td>${formattedCurrentHours}</td>
        <td class="will-log">8h</td>
      `;
      tableBody.appendChild(row);
    });

    modal.style.display = 'flex';
  }

  static hideConfirmationModal() {
    const modal = DOM.get('confirmationModal');
    if (modal) modal.style.display = 'none';
  }

  static showConfirmationModalManual(datesToLog, data1, onLogCallback, limitReached = false) {
    const modal = DOM.get('confirmationModalManual');
    const summary = DOM.get('modalSummaryManual');
    const tableBody = DOM.get('modalTableBodyManual');

    if (!modal || !summary || !tableBody) return;

    if (limitReached) {
      summary.innerHTML = `<span style="color: #e74c3c; font-weight: bold;">⚠️ You've reached your request limit for this month</span><br><br>Select days to log Attendance (${datesToLog.length} days available):`;
    } else {
      summary.textContent = `Select days to log Attendance (${datesToLog.length} days available):`;
    }

    tableBody.innerHTML = '';

    datesToLog.forEach(date => {
      const row = document.createElement('tr');
      const currentHours = data1.regDetails[date]?.totalhrs || 0;
      const formattedCurrentHours = Utils.formatSecondsToHoursMinutes(currentHours);

      const buttonStyle = limitReached 
        ? 'padding: 4px 8px; font-size: 12px; opacity: 0.5; cursor: not-allowed;' 
        : 'padding: 4px 8px; font-size: 12px;';

      row.innerHTML = `
        <td>${date}</td>
        <td>${formattedCurrentHours}</td>
        <td class="will-log">8h</td>
        <td>
          <button class="modal-button confirm" style="${buttonStyle}" data-date="${date}" ${limitReached ? 'disabled title="Request limit reached"' : ''}>
            Log
          </button>
        </td>
      `;

      const logButton = row.querySelector('.modal-button');
      
      if (!limitReached) {
        logButton.addEventListener('click', async () => {
          logButton.disabled = true;
          logButton.textContent = 'Logging...';

          const result = await onLogCallback([date]);

          if (result.success) {
            logButton.textContent = 'Logged';
            logButton.style.backgroundColor = '#28a745';
            UIManager.showMessage(`✅ Logged Attendance for ${date}. Refreshing...`, 'success');
            setTimeout(() => window.location.reload(), CONSTANTS.REFRESH_DELAY);
          } else {
            logButton.disabled = false;
            logButton.textContent = 'Log';
            UIManager.showMessage(`❌ Failed to log ${date}: ${result.error}`, 'error');
          }
        });
      }

      tableBody.appendChild(row);
    });

    modal.style.display = 'flex';
  }

  static hideConfirmationModalManual() {
    const modal = DOM.get('confirmationModalManual');
    if (modal) modal.style.display = 'none';
  }
}
