export const CATEGORIES = [
  'Passwords',
  'Financial',
  'Personal',
  'Work',
  'Social',
  'Gaming',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const UNCATEGORIZED_FILTER = '__uncategorized__' as const;

export const DELAY_PRESETS = {
  seconds: [30, 60, 120, 300],
  minutes: [5, 10, 15, 30, 60],
  hours: [1, 2, 4, 8, 12, 24],
  days: [1, 2, 3, 7],
} as const;
