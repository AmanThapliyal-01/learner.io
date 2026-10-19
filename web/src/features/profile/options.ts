export const AGE_RANGES = [
  { value: 'under-18', label: 'Under 18' },
  { value: '18-24', label: '18–24' },
  { value: '25-34', label: '25–34' },
  { value: '35-44', label: '35–44' },
  { value: '45-54', label: '45–54' },
  { value: '55+', label: '55 or older' },
] as const

export const CURRENT_STATUSES = [
  { value: 'student', label: 'Studying' },
  { value: 'working', label: 'Working' },
  { value: 'career-break', label: 'On a career break' },
  { value: 'other', label: 'Something else' },
] as const

/** Suggestions only; any country can be typed. */
export const COMMON_COUNTRIES = [
  'Australia', 'Bangladesh', 'Brazil', 'Canada', 'China', 'Egypt', 'France', 'Germany', 'India', 'Indonesia',
  'Ireland', 'Italy', 'Japan', 'Kenya', 'Malaysia', 'Mexico', 'Nepal', 'Netherlands', 'New Zealand', 'Nigeria',
  'Pakistan', 'Philippines', 'Singapore', 'South Africa', 'Spain', 'Sri Lanka', 'United Arab Emirates',
  'United Kingdom', 'United States', 'Vietnam',
]
