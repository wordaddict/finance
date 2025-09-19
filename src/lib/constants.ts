// Team constants - centralized definition of all available teams
export const TEAMS = {
  CCW: 'CCW',
  ADMIN: 'ADMIN', 
  SOCIAL_MEDIA: 'SOCIAL_MEDIA',
  VISION_AND_VOLUME: 'VISION_AND_VOLUME',
  CREATIVE: 'CREATIVE',
  AMBIENCE: 'AMBIENCE',
  REACH_OUT: 'REACH_OUT',
  CELEB_KIDS: 'CELEB_KIDS',
  PROTOCOL: 'PROTOCOL',
} as const

// Team display names for UI
export const TEAM_DISPLAY_NAMES = {
  [TEAMS.CCW]: 'CCW',
  [TEAMS.ADMIN]: 'Admin',
  [TEAMS.SOCIAL_MEDIA]: 'Social Media',
  [TEAMS.VISION_AND_VOLUME]: 'Vision and Volume',
  [TEAMS.CREATIVE]: 'Creative',
  [TEAMS.AMBIENCE]: 'Ambience',
  [TEAMS.REACH_OUT]: 'Reach Out',
  [TEAMS.CELEB_KIDS]: 'Celeb Kids',
  [TEAMS.PROTOCOL]: 'Protocol',
} as const

// Array of team values for easy iteration
export const TEAM_VALUES = Object.values(TEAMS)

// Type for team values
export type TeamValue = typeof TEAMS[keyof typeof TEAMS]

// Campus constants
export const CAMPUSES = {
  DMV: 'DMV',
  DALLAS: 'DALLAS', 
  BOSTON: 'BOSTON',
  AUSTIN: 'AUSTIN',
} as const

// Campus display names for UI
export const CAMPUS_DISPLAY_NAMES = {
  [CAMPUSES.DMV]: 'DMV',
  [CAMPUSES.DALLAS]: 'Dallas',
  [CAMPUSES.BOSTON]: 'Boston', 
  [CAMPUSES.AUSTIN]: 'Austin',
} as const

// Array of campus values for easy iteration
export const CAMPUS_VALUES = Object.values(CAMPUSES)

// Type for campus values
export type CampusValue = typeof CAMPUSES[keyof typeof CAMPUSES]

// Urgency constants
export const URGENCY_OPTIONS = {
  1: 'Not Urgent (Few months)',
  2: 'Urgent (This Month)', 
  3: 'Very Urgent (This week)',
} as const

// Urgency display names for UI
export const URGENCY_DISPLAY_NAMES = {
  [1]: 'Not Urgent (Few months)',
  [2]: 'Urgent (This Month)',
  [3]: 'Very Urgent (This week)',
} as const

// Array of urgency values for easy iteration
export const URGENCY_VALUES = Object.keys(URGENCY_OPTIONS).map(Number)

// Type for urgency values
export type UrgencyValue = keyof typeof URGENCY_OPTIONS

// Expense category constants
export const EXPENSE_CATEGORIES = {
  ADMINISTRATIVE_EXPENSES: 'Administrative Expenses',
  ADVERTISEMENT_AND_PUBLICITY: 'Advertisement and Publicity',
  AMBIENCE: 'Ambience',
  BANK_CHARGES: 'Bank Charges',
  CCI_GLOBAL: 'CCI Global',
  CCW_MUSIC_EXPENSES: 'CCW/Music Expenses',
  CELEB_KIDS: 'Celeb Kids',
  DMV_BUILDING_PROJECT: 'DMV Building Project',
  EQUIPMENT_PURCHASE: 'Equipment Purchase',
  EQUIPMENT_RENTAL: 'Equipment Rental',
  FOLLOW_UP: 'Follow Up',
  GUEST_MINISTER_WELFARE: 'Guest Minister Welfare',
  HONORARIUM: 'Honorarium',
  HOTEL_AND_ACCOMMODATION: 'Hotel and Accommodation',
  INTERNAL_FUND_TRANSFER: 'Internal Fund Transfer',
  INTERNET_TELEPHONE: 'Internet/telephone',
  LOGISTICS: 'Logistics',
  MEDIA_AND_TECHNICAL: 'Media and Technical',
  OTHERS: 'Others',
  OUTREACH: 'Outreach',
  PASTORAL_WELFARE: 'Pastoral Welfare',
  RENT: 'Rent',
  REPAIRS_AND_MAINTENANCE: 'Repairs and Maintenance',
  SALARIES_AND_ALLOWANCES: 'Salaries and Allowances',
  SECURITY_PROTOCOL: 'Security/Protocol',
  SPECIAL_EVENTS_AND_PROGRAMS: 'Special Events and Programs',
  SUBSCRIPTION: 'Subscription',
  TRAVEL_EXPENSES: 'Travel Expenses',
  WELFARE: 'Welfare',
} as const

// Array of expense category values for easy iteration
export const EXPENSE_CATEGORY_VALUES = Object.values(EXPENSE_CATEGORIES)

// Type for expense category values
export type ExpenseCategoryValue = typeof EXPENSE_CATEGORIES[keyof typeof EXPENSE_CATEGORIES]
