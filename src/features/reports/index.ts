export const reportPeriods = ['Last 30 days', 'Last 90 days', 'Last 12 months'] as const;
export type ReportPeriod = (typeof reportPeriods)[number];
