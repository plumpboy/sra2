// Configuration constants for the Working Time extension
export const CONSTANTS = {
  WORK_HOURS: {
    START: { hours: 7, minutes: 30 },
    END: { hours: 19, minutes: 30 },
    LUNCH_START: { hours: 12, minutes: 0 },
    LUNCH_END: { hours: 13, minutes: 15 },
    LATE_START_THRESHOLD: { hours: 10, minutes: 15 },
    STANDARD_WORK_HOURS: 8,
    LIMITED_WORK_HOURS: 6
  },
  TIME_CONVERSIONS: {
    SECONDS_PER_HOUR: 3600,
    SECONDS_PER_MINUTE: 60,
    MILLISECONDS_PER_HOUR: 3600000,
    MILLISECONDS_PER_MINUTE: 60000
  },
  THRESHOLDS: {
    SIX_HOURS_SECONDS: 21600,
    EIGHT_HOURS_SECONDS: 28800
  },
  REQUEST_LIMIT: 3,
  MESSAGE_TIMEOUT: 5000,
  REFRESH_DELAY: 1500
};
