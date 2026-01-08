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

  // Calculate valid working hours clamped to work schedule (7:30-19:30)
  // And subtract lunch break (12:00-13:15) if applicable
  calculateValidWorkHours(value) {
    if (!value || value.totalhrs === undefined) return 0;
    if (!value.fromdate || !value.todate) return value.totalhrs;

    const parseTime = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 3600 + minutes * 60;
    };

    const checkIn = parseTime(value.fromdate);
    const checkOut = parseTime(value.todate);

    const workStart = CONSTANTS.WORK_HOURS.START.hours * 3600 + CONSTANTS.WORK_HOURS.START.minutes * 60;
    const workEnd = CONSTANTS.WORK_HOURS.END.hours * 3600 + CONSTANTS.WORK_HOURS.END.minutes * 60;

    const lunchStart = CONSTANTS.WORK_HOURS.LUNCH_START.hours * 3600 + CONSTANTS.WORK_HOURS.LUNCH_START.minutes * 60;
    const lunchEnd = CONSTANTS.WORK_HOURS.LUNCH_END.hours * 3600 + CONSTANTS.WORK_HOURS.LUNCH_END.minutes * 60;

    const effectiveStart = Math.max(checkIn, workStart);
    const effectiveEnd = Math.min(checkOut, workEnd);

    if (effectiveEnd <= effectiveStart) return 0;

    let duration = effectiveEnd - effectiveStart;

    // Calculate overlap with lunch break
    const lunchOverlapStart = Math.max(effectiveStart, lunchStart);
    const lunchOverlapEnd = Math.min(effectiveEnd, lunchEnd);

    if (lunchOverlapEnd > lunchOverlapStart) {
      duration -= (lunchOverlapEnd - lunchOverlapStart);
    }

    return duration;
  },

  countEntriesBelow6h(regDetails) {
    // Get today's date in the same format as the data
    const today = Utils.formatDateToCustom(new Date());

    return Object.entries(regDetails).filter(([key, value]) => {
      if (!value || typeof value !== 'object') return false;

      // Exclude today's date - only analyze up to yesterday
      if (key === today || key === "dayList") return false;

      const totalHours = this.calculateValidWorkHours(value);
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

      const totalHours = this.calculateValidWorkHours(value);
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

      const totalHours = this.calculateValidWorkHours(value);
      const isHoliday = value.isHoliday || false;
      const isWeekend = value.isWeekend || false;

      return totalHours < CONSTANTS.THRESHOLDS.EIGHT_HOURS_SECONDS && !isHoliday && !isWeekend;
    }).length;
  },

  getTop3MinDatesByTotalHrs(data, requestDays) {
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

        if (!isWorkingDay || isInRequestedDays) return false;

        if (isAbsent && isWorkingDay) {
          return !isInRequestedDays;
        }

        const validHours = this.calculateValidWorkHours(value);
        return validHours < CONSTANTS.THRESHOLDS.EIGHT_HOURS_SECONDS;
      });
    return dayEntries
      .sort((a, b) => this.calculateValidWorkHours(a[1]) - this.calculateValidWorkHours(b[1]))
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

        const validHours = this.calculateValidWorkHours(value);
        return validHours < CONSTANTS.THRESHOLDS.EIGHT_HOURS_SECONDS;
      });

    return dayEntries
      .sort((a, b) => this.calculateValidWorkHours(a[1]) - this.calculateValidWorkHours(b[1]))
      .map(([date, value]) => {
        const validHours = this.calculateValidWorkHours(value);
        return {
          date,
          totalhrs: validHours,
          formattedHours: Utils.formatSecondsToHoursMinutes(validHours)
        };
      });
  }
};
