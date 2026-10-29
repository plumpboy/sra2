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
  // Each leave option covers part of the 8h standard day (quarter = 2h, half = 4h, full = 8h)
  LEAVE_OPTIONS: [
    { duration: 'quarter', days: 0.25, coverSeconds: 7200 },
    { duration: 'half', days: 0.5, coverSeconds: 14400 },
    { duration: 'full', days: 1, coverSeconds: 28800 }
  ],
  // Zoho leave application approval_status values
  LEAVE_STATUS: {
    PENDING: -1,
    REJECTED: 0,
    APPROVED: 1,
    CANCELLED: 2
  },
  REQUEST_LIMIT: 3,
  // Days with 6h-8h are auto settled to 8h as long as there are no more than this many of them
  MAX_LATE_DAYS: 5,
  MESSAGE_TIMEOUT: 5000,
  REFRESH_DELAY: 1500
};
