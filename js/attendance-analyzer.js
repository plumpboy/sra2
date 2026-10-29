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

  countUsedRequests(requestDays) {
    return requestDays.filter(item => item.status != 2 && item.status != 0).length;
  },

  // Work time each date will gain once its pending or approved requests are approved:
  //  - attendance requests: the regularized in/out time minus the hours already worked
  //  - leave applications: leave days x 8h
  // Returns { date: [{ type, seconds, days, pending }] }
  getExistingRequests(data, requestDays, leaves = []) {
    const regDetails = data.regDetails;
    const requests = {};
    const add = (date, request) => {
      (requests[date] = requests[date] || []).push(request);
    };

    requestDays
      .filter(item => item.status != 2 && item.status != 0)
      .forEach(item => {
        const pending = item.status != 1;
        if (!item.regDetails?.length) {
          // No per-day details: assume the request covers the full day
          add(item.startDate, { type: 'attendance', seconds: CONSTANTS.THRESHOLDS.EIGHT_HOURS_SECONDS, pending });
          return;
        }
        item.regDetails.forEach(reg => {
          const value = regDetails[reg.originday];
          const current = value && !this.isAbsent(value) ? this.calculateValidWorkHours(value) : 0;
          const requested = this.calculateValidWorkHours({
            fromdate: reg.new_intime,
            todate: reg.new_outtime,
            totalhrs: reg.new_totalHours
          });
          add(reg.originday, { type: 'attendance', seconds: Math.max(0, requested - current), pending });
        });
      });

    const { PENDING, APPROVED } = CONSTANTS.LEAVE_STATUS;
    leaves
      .filter(leave => leave.approval_status === PENDING || leave.approval_status === APPROVED)
      .forEach(leave => {
        const pending = leave.approval_status === PENDING;
        if (leave.from === leave.to) {
          add(leave.from, {
            type: 'leave',
            days: leave.leavetaken,
            seconds: leave.leavetaken * CONSTANTS.THRESHOLDS.EIGHT_HOURS_SECONDS,
            pending
          });
          return;
        }
        // Multi-day leave covers every working day in its range in full
        const from = Utils.parseCustomDate(leave.from);
        const to = Utils.parseCustomDate(leave.to);
        Object.entries(regDetails)
          .filter(([key, value]) => value && typeof value === 'object' && key !== 'dayList' && this.isWorkingDay(value))
          .filter(([key]) => {
            const date = Utils.parseCustomDate(key);
            return date >= from && date <= to;
          })
          .forEach(([key]) => add(key, { type: 'leave', days: 1, seconds: CONSTANTS.THRESHOLDS.EIGHT_HOURS_SECONDS, pending }));
      });

    return requests;
  },

  // Smallest leave that brings the day up to targetSeconds, with the period matching the missing part
  // (came late -> morning period, left early -> afternoon period). Returns null when nothing is needed.
  getMinimalLeave(value, targetSeconds = CONSTANTS.THRESHOLDS.EIGHT_HOURS_SECONDS) {
    const validHours = this.isAbsent(value) ? 0 : this.calculateValidWorkHours(value);
    const shortfall = targetSeconds - validHours;
    if (shortfall <= 0) return null;

    const option = CONSTANTS.LEAVE_OPTIONS.find(opt => opt.coverSeconds >= shortfall);
    if (option.duration === 'full') {
      return { duration: 'full', period: '', days: option.days };
    }

    // Compare against the 9:00-18:00 shift used for attendance regularization
    const lateMinutes = value.fromdate ? Utils.convertTimeToMinutes(value.fromdate) - 540 : 0;
    const earlyMinutes = value.todate ? 1080 - Utils.convertTimeToMinutes(value.todate) : 0;
    const isMorning = lateMinutes >= earlyMinutes;

    const period = option.duration === 'half'
      ? (isMorning ? '1st_half' : '2nd_half')
      : (isMorning ? '1st_quarter' : '4th_quarter');

    return { duration: option.duration, period, days: option.days };
  },

  // Settle every day below 8h with minimum total leave. Each day can be settled by:
  //  - 'request':  one attendance request (limited per month)
  //  - 'late':     leave up to 6h (often none), then auto settled to 8h as one of the MAX_LATE_DAYS late days
  //  - 'leave':    leave up to the full 8h
  // Days are few and both limits are small, so an exact DP over (requests used, late days used) is cheap.
  // Ties prefer using fewer requests, then fewer late days, keeping them for the rest of the month.
  // Days already covered by pending or approved requests are returned as requestedDays and left out of the plan;
  // partially covered days only plan for the time still missing.
  planLateDays(data, requestDays, leaves = []) {
    const remainingRequests = Math.max(0, CONSTANTS.REQUEST_LIMIT - this.countUsedRequests(requestDays));
    const maxLateDays = CONSTANTS.MAX_LATE_DAYS;
    const existingRequests = this.getExistingRequests(data, requestDays, leaves);
    const requestedDays = [];

    const days = this.getDaysBelow8h(data)
      .filter(day => !this.isPaidLeave(data.regDetails[day.date]))
      .map(day => {
        const value = data.regDetails[day.date];
        const requests = existingRequests[day.date] || [];
        const requestedSeconds = requests.reduce((sum, request) => sum + request.seconds, 0);
        const fullLeave = this.getMinimalLeave(value, CONSTANTS.THRESHOLDS.EIGHT_HOURS_SECONDS - requestedSeconds);
        const lateLeave = this.getMinimalLeave(value, CONSTANTS.THRESHOLDS.SIX_HOURS_SECONDS - requestedSeconds);
        const hasAttendanceRequest = requests.some(request => request.type === 'attendance');
        return { ...day, requests, hasAttendanceRequest, fullLeave, lateLeave };
      })
      .filter(day => {
        if (day.fullLeave) return true;
        if (day.requests.length > 0) requestedDays.push(day);
        return false;
      });

    const choiceCost = (day, choice) => {
      if (choice === 'request') return 0;
      if (choice === 'late') return day.lateLeave?.days || 0;
      return day.fullLeave.days;
    };

    // states: key "requests,lateDays" -> { cost, choices }
    let states = new Map([['0,0', { requests: 0, lateDays: 0, cost: 0, choices: [] }]]);
    for (const day of days) {
      const next = new Map();
      for (const state of states.values()) {
        for (const choice of ['request', 'late', 'leave']) {
          // A day gets at most one attendance request
          if (choice === 'request' && day.hasAttendanceRequest) continue;
          const requests = state.requests + (choice === 'request' ? 1 : 0);
          const lateDays = state.lateDays + (choice === 'late' ? 1 : 0);
          if (requests > remainingRequests || lateDays > maxLateDays) continue;

          const cost = state.cost + choiceCost(day, choice);
          const key = `${requests},${lateDays}`;
          if (!next.has(key) || cost < next.get(key).cost) {
            next.set(key, { requests, lateDays, cost, choices: [...state.choices, choice] });
          }
        }
      }
      states = next;
    }

    const best = [...states.values()]
      .sort((a, b) => a.cost - b.cost || a.requests - b.requests || a.lateDays - b.lateDays)[0];

    const attendanceDays = [];
    const leaveDays = [];
    const lateDays = [];
    days.forEach((day, index) => {
      const choice = best.choices[index];
      if (choice === 'request') {
        attendanceDays.push(day);
      } else if (choice === 'late' && !day.lateLeave) {
        lateDays.push(day);
      } else {
        const leave = choice === 'late' ? day.lateLeave : day.fullLeave;
        leaveDays.push({ ...day, leave, settlesAsLateDay: choice === 'late' });
      }
    });

    return {
      attendanceDays,
      leaveDays,
      lateDays,
      requestedDays,
      totalLeaveDays: best.cost,
      lateDaysUsed: best.lateDays,
      remainingRequests
    };
  },

  getDaysBelow8h(data) {
    const regDetails = data.regDetails;

    // Get today's date in the same format as the data
    const today = Utils.formatDateToCustom(new Date());
    const dayEntries = Object.entries(regDetails)
      .filter(([key, value]) => {
        if (!value || typeof value !== 'object') return false;

        // Exclude today's date - only analyze up to yesterday
        if (key === today || key === "dayList") return false;

        if (!this.isWorkingDay(value)) return false;
        if (this.isAbsent(value)) return true;

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
