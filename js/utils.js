import { CONSTANTS } from './constants.js';

// Utility Functions
export const Utils = {
  formatDateToCustom(date) {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return new Intl.DateTimeFormat('en-GB', options).format(date).replace(/ /g, '-');
  },

  getDateRange() {
    const today = new Date();
    const dayOfMonth = today.getDate();

    let fromDate;
    if (dayOfMonth <= 23) {
      const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 21);
      fromDate = this.formatDateToCustom(previousMonth);
    } else {
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 21);
      fromDate = this.formatDateToCustom(currentMonth);
    }

    const toDate = this.formatDateToCustom(today);
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
