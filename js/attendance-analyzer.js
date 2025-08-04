import { CONSTANTS } from './constants.js';
import { Utils } from './utils.js';

// Attendance Analysis Business Logic
// Note: All analysis functions exclude today's date and only calculate up to yesterday
export const AttendanceAnalyzer = {
  isWorkingDay(value) {
    return !value?.isHoliday && !value?.isWeekend;
  },

  isAbsent(value) {
    return value.todate === undefined;
  },

  isPaidLeave(value) {
    return value?.isPaidLeave || false;
  },

  countEntriesBelow6h(regDetails) {
    // Get today's date in the same format as the data
    const today = Utils.formatDateToCustom(new Date());

    return Object.entries(regDetails).filter(([key, value]) => {
      if (!value || typeof value !== 'object') return false;

      // Exclude today's date - only analyze up to yesterday
      if (key === today || key === "dayList") return false;

      const totalHours = value.totalhrs;
      const isHoliday = value.isHoliday || false;
      const isWeekend = value.isWeekend || false;
      const isAbsent = this.isAbsent(value);
      const isPaidLeave = this.isPaidLeave(value);

      if (!isHoliday && !isWeekend) {
        if (totalHours !== undefined && totalHours < CONSTANTS.THRESHOLDS.SIX_HOURS_SECONDS) {
          return true;
        } else if (isAbsent && !isPaidLeave) {
          return true;
        }
      }
      return false;
    }).length;
  },

  countEntriesFrom6hTo8h(regDetails) {
    // Get today's date in the same format as the data
    const today = Utils.formatDateToCustom(new Date());

    return Object.entries(regDetails).filter(([key, value]) => {
      if (!value || typeof value !== 'object' || value.totalhrs === undefined) return false;

      // Exclude today's date - only analyze up to yesterday
      if (key === today || key === "dayList") return false;

      const totalHours = value.totalhrs;
      const isHoliday = value.isHoliday || false;
      const isWeekend = value.isWeekend || false;

      return totalHours >= CONSTANTS.THRESHOLDS.SIX_HOURS_SECONDS &&
             totalHours < CONSTANTS.THRESHOLDS.EIGHT_HOURS_SECONDS &&
             !isHoliday && !isWeekend;
    }).length;
  },

  countEntriesBelow8h(regDetails) {
    // Get today's date in the same format as the data
    const today = Utils.formatDateToCustom(new Date());

    return Object.entries(regDetails).filter(([key, value]) => {
      if (!value || typeof value !== 'object' || value.totalhrs === undefined) return false;

      // Exclude today's date - only analyze up to yesterday
      if (key === today) return false;

      const totalHours = value.totalhrs;
      const isHoliday = value.isHoliday || false;
      const isWeekend = value.isWeekend || false;

      return totalHours < CONSTANTS.THRESHOLDS.EIGHT_HOURS_SECONDS && !isHoliday && !isWeekend;
    }).length;
  },

  getTop3MinDatesByTotalHrs(data, requestDays) {
    const regDetails = data.regDetails;
    const requestedDates = requestDays
      .filter(item => item.status != 2 && item.status!= 0)
      .map(day => day.startDate || day);

    // Get today's date in the same format as the data
    const today = Utils.formatDateToCustom(new Date());

    const dayEntries = Object.entries(regDetails)
      .filter(([key, value]) => {
        console.log("key: value", key, value)
        if (!value || typeof value !== 'object') return false;

        // Exclude today's date - only analyze up to yesterday
        if (key === today || key === "dayList") return false;

        const isWorkingDay = this.isWorkingDay(value);
        const isAbsent = this.isAbsent(value);
        const isInRequestedDays = requestedDates.includes(key);

        if (!isWorkingDay || isInRequestedDays) return false;

        if (isAbsent && isWorkingDay) {
          return !isInRequestedDays;
        }

        const isBelow8h = value.totalhrs < CONSTANTS.THRESHOLDS.EIGHT_HOURS_SECONDS;

        return isBelow8h;
      });
    return dayEntries
      .sort((a, b) => a[1].totalhrs - b[1].totalhrs)
      .slice(0, 3)
      .map(([date]) => date);
  },

  getDaysBelow8h(data, requestDays) {
    const regDetails = data.regDetails;
    const requestedDates = requestDays
      .filter(item => item.status != 2 && item.status != 0)
      .map(day => day.startDate || day);

    // Get today's date in the same format as the data
    const today = Utils.formatDateToCustom(new Date());
    const dayEntries = Object.entries(regDetails)
      .filter(([key, value]) => {
        if (!value || typeof value !== 'object') return false;

        // Exclude today's date - only analyze up to yesterday
        if (key === today || key === "dayList") return false;

        const isWorkingDay = this.isWorkingDay(value);
        const isAbsent = this.isAbsent(value);
        const isInRequestedDays = requestedDates.includes(key);

        if (!isWorkingDay || isInRequestedDays) {
          return false;
        }

        if (isAbsent) {
          return !isInRequestedDays;
        }

        const isBelow8h = value.totalhrs < CONSTANTS.THRESHOLDS.EIGHT_HOURS_SECONDS;
        return isBelow8h;
      });

    return dayEntries.map(([date, value]) => ({
      date,
      totalhrs: value.totalhrs || 0,
      formattedHours: Utils.formatSecondsToHoursMinutes(value.totalhrs || 0)
    }));
  }
};
