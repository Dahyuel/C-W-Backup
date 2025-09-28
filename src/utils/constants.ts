//constants.ts
export const FACULTIES = [
  'Faculty of Engineering',
  'Faculty of Medicine',
  'Faculty of Commerce',
  'Faculty of Law',
  'Faculty of Arts',
  'Faculty of Science',
  'Faculty of Pharmacy',
  'Faculty of Dentistry',
  'Faculty of Veterinary Medicine',
  'Faculty of Agriculture',
  'Faculty of Education',
  'Faculty of Nursing',
  'Faculty of Computer and Information Sciences',
  'Faculty of Economics and Political Science',
  'Faculty of Mass Communication',
  'Faculty of Physical Education',
  'Faculty of Fine Arts',
  'Faculty of Music Education',
  'Faculty of Archaeology',
  'Faculty of Social Work',
  'Faculty of Tourism and Hotels',
  'Faculty of Languages',
  'Faculty of Business Administration',
  'Faculty of Applied Arts',
  'Other'
];
export const ENUM_VALUES = {
  GENDER: ['male', 'female'] as const,
  DEGREE_LEVEL: ['student', 'graduate'] as const,
  CLASS_LEVEL: ['1', '2', '3', '4', '5'] as const,
  MARKETING_SOURCE: [
    'linkedin', 'facebook', 'instagram', 'friends', 
    'banners_in_street', 'information_session_at_faculty', 
    'campus_marketing', 'other'
  ] as const,
  USER_ROLE: [
    'admin', 'team_leader', 'registration', 'building', 
    'attendee', 'volunteer', 'info_desk'
  ] as const
};


export const CLASS_YEARS = [
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' }, 
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
  { value: '5', label: '5th Year' }
];

export const HOW_DID_YOU_HEAR_OPTIONS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'friends', label: 'Friends' },
  { value: 'banners_in_street', label: 'Banners in Street' },
  { value: 'information_session_at_faculty', label: 'Information Session at Faculty' },
  { value: 'campus_marketing', label: 'Campus Marketing' },
  { value: 'other', label: 'Other' }
];

export const UNIVERSITIES = [
  'Ain Shams University',
  'Other'
];