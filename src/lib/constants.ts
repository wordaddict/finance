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
