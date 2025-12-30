import { CONSTANTS } from './constants.js';
import { Utils } from './utils.js';

// Cache time constants to avoid repeated creation
const WORK_SCHEDULE = {
  workStart: Utils.createTime(CONSTANTS.WORK_HOURS.START.hours, CONSTANTS.WORK_HOURS.START.minutes),
  workEnd: Utils.createTime(CONSTANTS.WORK_HOURS.END.hours, CONSTANTS.WORK_HOURS.END.minutes),
  lunchStart: Utils.createTime(CONSTANTS.WORK_HOURS.LUNCH_START.hours, CONSTANTS.WORK_HOURS.LUNCH_START.minutes),
  lunchEnd: Utils.createTime(CONSTANTS.WORK_HOURS.LUNCH_END.hours, CONSTANTS.WORK_HOURS.LUNCH_END.minutes),
  lateThreshold: Utils.createTime(CONSTANTS.WORK_HOURS.LATE_START_THRESHOLD.hours, CONSTANTS.WORK_HOURS.LATE_START_THRESHOLD.minutes),
  breakDurationMs: Utils.createTime(CONSTANTS.WORK_HOURS.LUNCH_END.hours, CONSTANTS.WORK_HOURS.LUNCH_END.minutes) -
                   Utils.createTime(CONSTANTS.WORK_HOURS.LUNCH_START.hours, CONSTANTS.WORK_HOURS.LUNCH_START.minutes),
  standardWorkMs: CONSTANTS.WORK_HOURS.STANDARD_WORK_HOURS * CONSTANTS.TIME_CONVERSIONS.MILLISECONDS_PER_HOUR,
  limitedWorkMs: CONSTANTS.WORK_HOURS.LIMITED_WORK_HOURS * CONSTANTS.TIME_CONVERSIONS.MILLISECONDS_PER_HOUR
};

// Time Calculation Logic
export const TimeCalculator = {
  calculateTimeDifference(startWorkingTime) {
    const [hours, minutes] = startWorkingTime.split(':').map(Number);
    const startTime = Utils.createTime(hours, minutes);
    const currentTime = new Date();
    console.log('startTime', startTime);
    // Quick boundary checks first
    if (currentTime < WORK_SCHEDULE.workStart) {
      return [
        'Not started yet',
        Utils.formatTime(WORK_SCHEDULE.workStart),
        Utils.formatTime(WORK_SCHEDULE.workEnd)
      ];
    }

    if (currentTime > WORK_SCHEDULE.workEnd) {
      return [
        'Work day ended',
        Utils.formatTime(startTime),
        Utils.formatTime(WORK_SCHEDULE.workEnd)
      ];
    }

    // Calculate effective start time (enforce minimum 7:30)
    const effectiveStartTime = startTime < WORK_SCHEDULE.workStart ? WORK_SCHEDULE.workStart : startTime;
    const isLateStart = effectiveStartTime > WORK_SCHEDULE.lateThreshold;

    // Calculate worked time based on current position relative to lunch
    const startedBeforeLunch = effectiveStartTime < WORK_SCHEDULE.lunchStart;
    const workEndPoint = currentTime > WORK_SCHEDULE.lunchEnd ? currentTime :
                         currentTime > WORK_SCHEDULE.lunchStart ? WORK_SCHEDULE.lunchStart : currentTime;
    const actualStart = startedBeforeLunch ? effectiveStartTime : WORK_SCHEDULE.lunchEnd;
    const lunchDeduct = startedBeforeLunch && currentTime > WORK_SCHEDULE.lunchEnd ? WORK_SCHEDULE.breakDurationMs : 0;

    let workedMs = workEndPoint - actualStart - lunchDeduct;

    workedMs = Math.max(0, workedMs);
    // Convert to hours and minutes
    const workedHrs = Math.floor(workedMs / CONSTANTS.TIME_CONVERSIONS.MILLISECONDS_PER_HOUR);
    const workedMins = Math.floor((workedMs % CONSTANTS.TIME_CONVERSIONS.MILLISECONDS_PER_HOUR) / CONSTANTS.TIME_CONVERSIONS.MILLISECONDS_PER_MINUTE);
    console.log('workedMs', workedHrs, workedMins);

    // Calculate end time and max duration
    let endTime, maxDurationText;

    if (isLateStart) {
      // Calculate actual max possible time first
      // If started during lunch break, actual work starts from lunch end
      const actualWorkStart = (effectiveStartTime >= WORK_SCHEDULE.lunchStart && effectiveStartTime <= WORK_SCHEDULE.lunchEnd)
        ? WORK_SCHEDULE.lunchEnd : effectiveStartTime;
      const lunchDeduction = actualWorkStart < WORK_SCHEDULE.lunchStart ? WORK_SCHEDULE.breakDurationMs : 0;
      const maxPossibleMs = WORK_SCHEDULE.workEnd - actualWorkStart - lunchDeduction;
      const maxPossibleHours = maxPossibleMs / CONSTANTS.TIME_CONVERSIONS.MILLISECONDS_PER_HOUR;

      // Determine working time cap based on available time
      let workingCapHours, workingCapMs;

      if (maxPossibleHours >= 4 && maxPossibleHours < 6) {
        // Cap at 4 hours
        workingCapHours = 4;
        workingCapMs = 4 * CONSTANTS.TIME_CONVERSIONS.MILLISECONDS_PER_HOUR;
        endTime = new Date(effectiveStartTime.getTime() + workingCapMs + lunchDeduction);

        const maxHrs = Math.floor(maxPossibleHours);
        const maxMins = Math.floor((maxPossibleMs % CONSTANTS.TIME_CONVERSIONS.MILLISECONDS_PER_HOUR) / CONSTANTS.TIME_CONVERSIONS.MILLISECONDS_PER_MINUTE);
        maxDurationText = `${workedHrs}h ${workedMins}m (capped at 4h, max ${maxHrs}h ${maxMins}m available)`;

      } else if (maxPossibleHours >= 2 && maxPossibleHours < 4) {
        // Cap at 2 hours
        workingCapHours = 2;
        workingCapMs = 2 * CONSTANTS.TIME_CONVERSIONS.MILLISECONDS_PER_HOUR;
        endTime = new Date(effectiveStartTime.getTime() + workingCapMs + lunchDeduction);

        const maxHrs = Math.floor(maxPossibleHours);
        const maxMins = Math.floor((maxPossibleMs % CONSTANTS.TIME_CONVERSIONS.MILLISECONDS_PER_HOUR) / CONSTANTS.TIME_CONVERSIONS.MILLISECONDS_PER_MINUTE);
        maxDurationText = `${workedHrs}h ${workedMins}m (capped at 2h, max ${maxHrs}h ${maxMins}m available)`;

      } else if (maxPossibleHours < 2) {
        // Not enough time to work effectively - display Null for end time
        const maxHrs = Math.floor(maxPossibleHours);
        const maxMins = Math.floor((maxPossibleMs % CONSTANTS.TIME_CONVERSIONS.MILLISECONDS_PER_HOUR) / CONSTANTS.TIME_CONVERSIONS.MILLISECONDS_PER_MINUTE);
        maxDurationText = `${workedHrs}h ${workedMins}m (insufficient time, max ${maxHrs}h ${maxMins}m available)`;

        return [
          maxDurationText,
          Utils.formatTime(effectiveStartTime),
          "You can leave the office now."
        ];

      } else {
        workingCapHours = 6;
        workingCapMs = 6 * CONSTANTS.TIME_CONVERSIONS.MILLISECONDS_PER_HOUR;
        endTime = new Date(effectiveStartTime.getTime() + workingCapMs + lunchDeduction);

        const maxHrs = Math.floor(maxPossibleMs / CONSTANTS.TIME_CONVERSIONS.MILLISECONDS_PER_HOUR);
        const maxMins = Math.floor((maxPossibleMs % CONSTANTS.TIME_CONVERSIONS.MILLISECONDS_PER_HOUR) / CONSTANTS.TIME_CONVERSIONS.MILLISECONDS_PER_MINUTE);
        maxDurationText = `${workedHrs}h ${workedMins}m (capped at 6h, max ${maxHrs}h ${maxMins}m today)`;
      }
    } else {
      // Standard 8h day
      endTime = new Date(effectiveStartTime.getTime() + WORK_SCHEDULE.standardWorkMs + WORK_SCHEDULE.breakDurationMs);
      maxDurationText = `${workedHrs}h ${workedMins}m`;
    }

    return [
      maxDurationText,
      Utils.formatTime(effectiveStartTime),
      Utils.formatTime(endTime)
    ];
  }
};
