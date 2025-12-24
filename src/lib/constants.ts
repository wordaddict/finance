// Team constants - centralized definition of all available teams
export const TEAMS = {
  // Photography and Storytelling
  PHOTOGRAPHY_AND_STORYTELLING: 'PHOTOGRAPHY_AND_STORYTELLING',


  FOLLOW_UP: 'FOLLOW_UP',

 

  
  // CCW
  CCW: 'CCW',
  
  // Ambience
  AMBIENCE: 'AMBIENCE',
  
  // Legacy teams (keeping for backward compatibility)
  ADMIN: 'ADMINISTRATION',
  SOCIAL_MEDIA: 'SOCIAL_MEDIA',
  VISION_AND_VOLUME: 'VISION_AND_VOLUME',
  CREATIVE: 'CREATIVE',
  CONNECTIONS_AND_COMMUNITY: 'CONNECTIONS_AND_COMMUNITY',
  VIRTUAL_DESIGN: 'VIRTUAL_DESIGN',
  CELEB_KIDS: 'CELEB_KIDS',
  PROTOCOL: 'PROTOCOL_AND_CHURCH_EXPERIENCE',
} as const

// Team display names for UI
export const TEAM_DISPLAY_NAMES = {
  // Photography and Storytelling
  [TEAMS.PHOTOGRAPHY_AND_STORYTELLING]: 'Photography and Storytelling',
  // Follow Up
  [TEAMS.FOLLOW_UP]: 'Follow Up',
  // CCW
  [TEAMS.CCW]: 'CCW',
  // Ambience
  [TEAMS.AMBIENCE]: 'Ambience',
  // Legacy teams
  [TEAMS.ADMIN]: 'Administration',
  [TEAMS.SOCIAL_MEDIA]: 'Social Media',
  [TEAMS.VISION_AND_VOLUME]: 'Vision and Volume',
  [TEAMS.CREATIVE]: 'Creative',
  [TEAMS.CONNECTIONS_AND_COMMUNITY]: 'Connections and Community',
  [TEAMS.VIRTUAL_DESIGN]: 'Virtual Design',
  [TEAMS.CELEB_KIDS]: 'Celeb Kids',
  [TEAMS.PROTOCOL]: 'Protocol and Church Experience',
} as const

// Array of team values for easy iteration
export const TEAM_VALUES = Object.values(TEAMS)

// Type for team values
export type TeamValue = typeof TEAMS[keyof typeof TEAMS]

// Campus constants
export const CAMPUSES = {
  DMV: 'DMV',
  CCI_VIRTUAL: 'CCI_VIRTUAL',
  DALLAS: 'DALLAS', 
  BOSTON: 'BOSTON',
  AUSTIN: 'AUSTIN',
  CCI_USA_NASHVILLE: 'CCI_USA_NASHVILLE',
  CCI_USA_OKLAHOMA: 'CCI_USA_OKLAHOMA',
  CCI_USA_NEWYORK_NEWJERSEY: 'CCI_USA_NEWYORK_NEWJERSEY',
  CCI_USA_KNOXVILLE: 'CCI_USA_KNOXVILLE',
  CCI_USA_NORTH_CAROLINA: 'CCI_USA_NORTH_CAROLINA',
  CCI_USA_ATLANTA: 'CCI_USA_ATLANTA',
  CCI_USA_BAY_AREA: 'CCI_USA_BAY_AREA',
  CCI_USA_CHICAGO: 'CCI_USA_CHICAGO',
} as const

// Campus display names for UI
export const CAMPUS_DISPLAY_NAMES = {
  [CAMPUSES.DMV]: 'CCI DMV',
  [CAMPUSES.DALLAS]: 'CCI Dallas',
  [CAMPUSES.BOSTON]: 'CCI Boston', 
  [CAMPUSES.AUSTIN]: 'CCI Austin',
  [CAMPUSES.CCI_VIRTUAL]: 'CCI-USA Virtual',
  [CAMPUSES.CCI_USA_NASHVILLE]: 'CCI-USA Nashville',
  [CAMPUSES.CCI_USA_OKLAHOMA]: 'CCI-USA Oklahoma',
  [CAMPUSES.CCI_USA_NEWYORK_NEWJERSEY]: 'CCI-USA New York/New Jersey',
  [CAMPUSES.CCI_USA_KNOXVILLE]: 'CCI-USA Knoxville',
  [CAMPUSES.CCI_USA_NORTH_CAROLINA]: 'CCI-USA North Carolina',
  [CAMPUSES.CCI_USA_ATLANTA]: 'CCI-USA Atlanta',
  [CAMPUSES.CCI_USA_BAY_AREA]: 'CCI-USA Bay Area',
  [CAMPUSES.CCI_USA_CHICAGO]: 'CCI-USA Chicago',
} as const

// Array of campus values for easy iteration
export const CAMPUS_VALUES = Object.values(CAMPUSES)

// Type for campus values
export type CampusValue = typeof CAMPUSES[keyof typeof CAMPUSES]

// Account constants
export const ACCOUNTS = {
  CCI_DMV_CHECKINGS: 'CCI_DMV_CHECKINGS',
  CCI_USA_CHECKINGS: 'CCI_USA_CHECKINGS',
  CCI_DALLAS_CHECKING: 'CCI_DALLAS_CHECKING',
  CCI_BOSTON_CHECKINGS: 'CCI_BOSTON_CHECKINGS',
  CCI_AUSTIN_CHECKINGS: 'CCI_AUSTIN_CHECKINGS',
  CCI_DMV_SAVINGS: 'CCI_DMV_SAVINGS',
  CCI_DALLAS_SAVINGS: 'CCI_DALLAS_SAVINGS',
  CCI_BOSTON_SAVINGS: 'CCI_BOSTON_SAVINGS',
  CCI_AUSTIN_SAVINGS: 'CCI_AUSTIN_SAVINGS',
  CCI_GLOBAL: 'CCI_GLOBAL',
  CCI_SEED_CHURCH_CHECKINGS: 'CCI_SEED_CHURCH_CHECKINGS',
  CCI_SPECIAL_EVENT_CHECKINGS: 'CCI_SPECIAL_EVENT_CHECKINGS',
} as const

// Account display names for UI
export const ACCOUNT_DISPLAY_NAMES = {
  [ACCOUNTS.CCI_DMV_CHECKINGS]: 'CCI DMV Checkings',
  [ACCOUNTS.CCI_USA_CHECKINGS]: 'CCI USA Checkings',
  [ACCOUNTS.CCI_DALLAS_CHECKING]: 'CCI Dallas Checking',
  [ACCOUNTS.CCI_BOSTON_CHECKINGS]: 'CCI Boston Checkings',
  [ACCOUNTS.CCI_AUSTIN_CHECKINGS]: 'CCI Austin Checkings',
  [ACCOUNTS.CCI_DMV_SAVINGS]: 'CCI DMV Savings',
  [ACCOUNTS.CCI_DALLAS_SAVINGS]: 'CCI Dallas Savings',
  [ACCOUNTS.CCI_BOSTON_SAVINGS]: 'CCI Boston Savings',
  [ACCOUNTS.CCI_AUSTIN_SAVINGS]: 'CCI Austin Savings',
  [ACCOUNTS.CCI_GLOBAL]: 'CCI Global',
  [ACCOUNTS.CCI_SEED_CHURCH_CHECKINGS]: 'CCI Seed Church Checkings',
  [ACCOUNTS.CCI_SPECIAL_EVENT_CHECKINGS]: 'CCI Special Event Checkings',
} as const

// Array of account values for easy iteration
export const ACCOUNT_VALUES = Object.values(ACCOUNTS)

// Type for account values
export type AccountValue = typeof ACCOUNTS[keyof typeof ACCOUNTS]

// Admin Category constants
export const EXPENSE_TYPES = {
  DIRECT_PAYMENT: 'Direct Payment',
  INTERNAL_TRANSFER: 'Internal Transfer',
  PAYMENT_REIMBURSEMENT: 'Payment Reimbursement',
  PAYMENT_REQUEST: 'Payment Request',
  OTHER: 'Other',
} as const

// Array of admin category values for easy iteration
export const EXPENSE_TYPE_VALUES = Object.values(EXPENSE_TYPES)

// Type for admin category values
export type ExpenseTypeValue = typeof EXPENSE_TYPES[keyof typeof EXPENSE_TYPES]

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
  DMV_BUILDING_PROJECT: 'Building Project',
  EQUIPMENT_PURCHASE: 'Equipment Purchase',
  EQUIPMENT_RENTAL: 'Equipment Rental',
  FINANCIAL_WELFARE: 'Financial Welfare/Assistance',
  FOOD: 'Food',
  FOLLOW_UP: 'Follow Up',
  GUEST_MINISTER_HONORARIUM: 'Guest Minister Honorarium',
  GUEST_MINISTER_HOTEL_ACCOMMODATION: 'Guest Minister Hotel/Accommodation',
  GUEST_MINISTER_TRAVEL_EXPENSE: 'Guest Minister Travel Expense',
  GUEST_MINISTER_WELFARE: 'Guest Minister Hospitality',
  HONORARIUM: 'Other Honorarium',
  HOSPITALITY: 'Hospitality',
  HOTEL_AND_ACCOMMODATION: 'Hotel and Accommodation',
  INTERNET_TELEPHONE: 'Internet/telephone',
  LOGISTICS: 'Logistics',
  MAP: 'MAP',
  MEDIA_AND_TECHNICAL: 'Media and Technical',
  OTHERS: 'Others',
  OUTREACH: 'Outreach',
  PASTORAL_TRAVEL_EXPENSE: 'Pastoral Travel/Expense',
  RENT: 'Rent',
  REPAIRS_AND_MAINTENANCE: 'Repairs and Maintenance',
  SALARIES_AND_ALLOWANCES: 'Salaries and Allowances',
  SECURITY_PROTOCOL: 'Protocol/Security',
  SOCIAL_MEDIA: 'Social Media',
  SPECIAL_EVENTS_AND_PROGRAMS: 'Special Events and Programs',
  SUBSCRIPTION: 'Subscription',
  TRAVEL_EXPENSES: 'Travel Expenses',
  WELFARE: 'General Welfare',
} as const

// Array of expense category values for easy iteration
export const EXPENSE_CATEGORY_VALUES = Object.values(EXPENSE_CATEGORIES)

// Type for expense category values
export type ExpenseCategoryValue = typeof EXPENSE_CATEGORIES[keyof typeof EXPENSE_CATEGORIES]

// Status constants
export const STATUS = {
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  DENIED: 'DENIED',
  CHANGE_REQUESTED: 'CHANGE_REQUESTED',
  PAID: 'PAID',
  EXPENSE_REPORT_REQUESTED: 'EXPENSE_REPORT_REQUESTED',
  CLOSED: 'CLOSED',
} as const

// Status display names for UI
export const STATUS_DISPLAY_NAMES = {
  [STATUS.SUBMITTED]: 'Submitted',
  [STATUS.APPROVED]: 'Approved',
  [STATUS.DENIED]: 'Denied',
  [STATUS.CHANGE_REQUESTED]: 'Change Requested',
  [STATUS.PAID]: 'Paid',
  [STATUS.EXPENSE_REPORT_REQUESTED]: 'Expense Report Requested',
  [STATUS.CLOSED]: 'Closed',
} as const

// Array of status values
export const STATUS_VALUES = Object.values(STATUS)

// Type for status values
export type StatusValue = typeof STATUS[keyof typeof STATUS]
