import { CONSTANTS } from './constants.js';

// Utility Functions
export const Utils = {
  formatDateToCustom(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  },

  // Parse dates like "23-Oct-2026" (new Date() does not parse this format in every browser)
  parseCustomDate(dateStr) {
    const [day, month, year] = dateStr.split('-');
    const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month);
    return new Date(Number(year), monthIndex, Number(day));
  },

  // Current time in Vietnam (UTC+7) whatever the computer's timezone: getDate(), getHours()... return UTC+7 values
  nowUTC7() {
    const shifted = new Date(Date.now() + 7 * CONSTANTS.TIME_CONVERSIONS.MILLISECONDS_PER_HOUR);
    return new Date(
      shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(),
      shifted.getUTCHours(), shifted.getUTCMinutes(), shifted.getUTCSeconds()
    );
  },

  // The previous month (21st - 20th) is shown until the end of the 21st (UTC+7), the new one from the 22nd
  getDateRange() {
    const today = this.nowUTC7();
    const dayOfMonth = today.getDate();
    let toDate = this.formatDateToCustom(today);
    let fromDate;
    if (dayOfMonth < 22) {
      const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 21);
      fromDate = this.formatDateToCustom(previousMonth);
      if (dayOfMonth <= 20) {
        toDate = this.formatDateToCustom(today);
      } else {
        toDate = this.formatDateToCustom(new Date(today.getFullYear(), today.getMonth(), 20));
      }
    } else {
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 21);
      fromDate = this.formatDateToCustom(currentMonth);
    }

    return { fromDate, toDate };
  },

  formatSecondsToHoursMinutes(seconds) {
    if (!seconds || seconds === 0) return '0h 0m';

    const hours = Math.floor(seconds / CONSTANTS.TIME_CONVERSIONS.SECONDS_PER_HOUR);
    const minutes = Math.floor((seconds % CONSTANTS.TIME_CONVERSIONS.SECONDS_PER_HOUR) / CONSTANTS.TIME_CONVERSIONS.SECONDS_PER_MINUTE);

    return `${hours}h ${minutes}m`;
  },

  convertTimeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  },

  createTime(hours, minutes) {
    const time = new Date();
    time.setHours(hours, minutes, 0, 0);
    return time;
  },

  formatTime(time) {
    return `${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')}`;
  }
};
