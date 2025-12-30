import { CONSTANTS } from './constants.js';
import { DOM } from './dom.js';
import { Utils } from './utils.js';
import { ApiService } from './api-service.js';

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

  static showModalSuccessMessage(message) {
    const successMessageEl = document.getElementById('modalSuccessMessageManual');
    const modalContent = document.querySelector('#confirmationModalManual .modal-content');
    if (successMessageEl) {
      successMessageEl.textContent = message;
      successMessageEl.style.display = 'block';
      if (modalContent) {
        modalContent.scrollTop = 0;
      }
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
    
    // Hide month transition note when resetting
    DOM.setDisplay('monthTransitionNote', 'none');
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

  static showConfirmationModalManual(datesToLog, data1, onLogCallback, limitReached = false, credentials = null) {
    const modal = DOM.get('confirmationModalManual');
    const summary = DOM.get('modalSummaryManual');
    const tableBody = DOM.get('modalTableBodyManual');
    const successMessageEl = document.getElementById('modalSuccessMessageManual');

    if (!modal || !summary || !tableBody) return;

    // Clear previous success message
    if (successMessageEl) {
      successMessageEl.style.display = 'none';
      successMessageEl.textContent = '';
    }

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
        <td style="display: flex; gap: 4px;">
          <button class="modal-button confirm log-btn" style="${buttonStyle}" data-date="${date}" ${limitReached ? 'disabled title="Request limit reached"' : ''}>
            Log Attandance
          </button>
          <button class="modal-button leave-btn" style="${buttonStyle} background-color: #007bff; color: white; border: none;" data-date="${date}" ${limitReached ? 'disabled title="Request limit reached"' : ''}>
            Apply Leave
          </button>
        </td>
      `;

      const logButton = row.querySelector('.log-btn');
      const leaveButton = row.querySelector('.leave-btn');

      if (!limitReached) {
        logButton.addEventListener('click', async () => {
          logButton.disabled = true;
          leaveButton.disabled = true;
          logButton.textContent = 'Logging...';

          const result = await onLogCallback([date]);

          if (result.success) {
            logButton.textContent = 'Logged';
            logButton.style.backgroundColor = '#28a745';
            UIManager.showModalSuccessMessage(`Logged attendance for ${date} successfully! Refreshing...`);
            setTimeout(() => window.location.reload(), CONSTANTS.REFRESH_DELAY);
          } else {
            logButton.disabled = false;
            leaveButton.disabled = false;
            logButton.textContent = 'Log';
            UIManager.showMessage(`❌ Failed to log ${date}: ${result.error}`, 'error');
          }
        });

        leaveButton.addEventListener('click', () => {
          UIManager.showLeaveModal(date, logButton, leaveButton, credentials);
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

  static async showLeaveModal(date, logButton, leaveButton, credentials) {
    const modal = document.getElementById('leaveRequestModal');
    const dateDisplay = document.getElementById('leaveModalDate');
    const leaveTypeSelect = document.getElementById('leaveType');
    const periodSelect = document.getElementById('leavePeriod');
    const reasonTextarea = document.getElementById('leaveReason');

    // Clone elements to remove old listeners
    const durationSelect = document.getElementById('leaveDuration');
    const newDurationSelect = durationSelect.cloneNode(true);
    durationSelect.parentNode.replaceChild(newDurationSelect, durationSelect);

    const cancelBtn = document.getElementById('leaveModalCancel');
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    const confirmBtn = document.getElementById('leaveModalConfirm');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    if (!modal || !dateDisplay) return;

    dateDisplay.textContent = date;

    // Clear previous message and reset styles
    const leaveModalError = document.getElementById('leaveModalError');
    if (leaveModalError) {
      leaveModalError.style.display = 'none';
      leaveModalError.textContent = '';
      // Reset to default error styles
      leaveModalError.style.backgroundColor = '#f8d7da';
      leaveModalError.style.color = '#721c24';
      leaveModalError.style.border = '1px solid #f5c6cb';
    }

    // Reset form
    newDurationSelect.value = 'full';
    periodSelect.disabled = true;
    periodSelect.innerHTML = '<option value="">N/A</option>';
    reasonTextarea.value = '';

    // Load leave types from API
    leaveTypeSelect.innerHTML = '<option value="">Loading...</option>';
    leaveTypeSelect.disabled = true;

    try {
      if (credentials) {
        const response = await ApiService.getLeaveTypes(credentials.hrId, credentials.csrfToken, credentials.userId);
        const options = response.leave_data?.Options;
        if (options && options.length > 0) {
          leaveTypeSelect.innerHTML = options.map(option => {
            // Decode HTML entities in Value
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = option.Value;
            const decodedValue = tempDiv.textContent || tempDiv.innerText;
            return `<option value="${option.Id}">${decodedValue}</option>`;
          }).join('');
          leaveTypeSelect.disabled = false;
        } else {
          leaveTypeSelect.innerHTML = '<option value="">No leave types available</option>';
        }
      } else {
        leaveTypeSelect.innerHTML = '<option value="">Error: No credentials</option>';
      }
    } catch (error) {
      console.error('Failed to load leave types:', error);
      leaveTypeSelect.innerHTML = '<option value="">Failed to load leave types</option>';
    }

    // Handle duration change
    newDurationSelect.addEventListener('change', (e) => {
      const duration = e.target.value;

      if (duration === 'full') {
        periodSelect.disabled = true;
        periodSelect.innerHTML = '<option value="">N/A</option>';
      } else if (duration === 'half') {
        periodSelect.disabled = false;
        periodSelect.innerHTML = `
          <option value="1st_half">1st Half</option>
          <option value="2nd_half">2nd Half</option>
        `;
      } else if (duration === 'quarter') {
        periodSelect.disabled = false;
        periodSelect.innerHTML = `
          <option value="1st_quarter">1st Quarter</option>
          <option value="2nd_quarter">2nd Quarter</option>
          <option value="3rd_quarter">3rd Quarter</option>
          <option value="4th_quarter">4th Quarter</option>
        `;
      }
    });

    // Handle cancel
    newCancelBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Handle confirm
    newConfirmBtn.addEventListener('click', async () => {
      const leaveTypeId = leaveTypeSelect.value;
      const leaveTypeName = leaveTypeSelect.options[leaveTypeSelect.selectedIndex]?.text || '';
      const duration = newDurationSelect.value;
      const period = periodSelect.value;
      const reason = reasonTextarea.value.trim();

      if (!leaveTypeId) {
        UIManager.showMessage('Please select a leave type', 'error');
        return;
      }

      newConfirmBtn.disabled = true;
      newConfirmBtn.textContent = 'Applying...';
      logButton.disabled = true;
      leaveButton.disabled = true;

      try {
        const response = await ApiService.applyLeave(
          credentials.hrId,
          credentials.csrfToken,
          credentials.userId,
          credentials.loginUserZUID,
          {
            leaveTypeId,
            date,
            reason,
            duration,
            period
          }
        );

        // Check for success (code 7000) - handle both object and array response
        const responseData = Array.isArray(response) ? response[0] : response;
        if (responseData?.code === 7000 || responseData?.pkId || response.status === 'success') {
          leaveButton.textContent = 'Applied';
          leaveButton.style.backgroundColor = '#28a745';
          // Show success message in leave modal
          const leaveModalError = document.getElementById('leaveModalError');
          if (leaveModalError) {
            leaveModalError.textContent = `Leave applied successfully for ${date} (${leaveTypeName}). Refreshing...`;
            leaveModalError.style.display = 'block';
            leaveModalError.style.backgroundColor = '#d4edda';
            leaveModalError.style.color = '#155724';
            leaveModalError.style.border = '1px solid #c3e6cb';
          }
          setTimeout(() => window.location.reload(), CONSTANTS.REFRESH_DELAY);
        } else {
          // Handle error response (array format or object format)
          let errorMsg = 'Unknown error';
          if (Array.isArray(response) && response.length > 0) {
            const errorObj = response[0];
            if (errorObj.message) {
              errorMsg = typeof errorObj.message === 'object'
                ? Object.values(errorObj.message).join(', ')
                : errorObj.message;
            }
          } else if (response.message) {
            errorMsg = typeof response.message === 'object'
              ? Object.values(response.message).join(', ')
              : response.message;
          } else if (response.error) {
            errorMsg = response.error;
          }
          // Show error in leave modal
          const leaveModalError = document.getElementById('leaveModalError');
          if (leaveModalError) {
            leaveModalError.textContent = errorMsg;
            leaveModalError.style.display = 'block';
          }
          newConfirmBtn.disabled = false;
          newConfirmBtn.textContent = 'Apply Leave';
          logButton.disabled = false;
          leaveButton.disabled = false;
        }
      } catch (error) {
        console.error('Error applying leave:', error);
        const leaveModalError = document.getElementById('leaveModalError');
        if (leaveModalError) {
          leaveModalError.textContent = `Error: ${error.message}`;
          leaveModalError.style.display = 'block';
        }
        newConfirmBtn.disabled = false;
        newConfirmBtn.textContent = 'Apply Leave';
        logButton.disabled = false;
        leaveButton.disabled = false;
      }
    });

    modal.style.display = 'flex';
  }

  static hideLeaveModal() {
    const modal = DOM.get('leaveRequestModal');
    if (modal) modal.style.display = 'none';
  }
}
