// ─── NAGS (National Auto Glass Specifications) Constants ───
export const NAGS_PREFIXES = {
  WINDSHIELD: 'FW',
  REAR_WINDOW: 'FB',
  DOOR_GLASS: 'DD',
  QUARTER_GLASS: 'DQ',
  VENT_GLASS: 'DV',
  BACK_GLASS: 'FB',
  SIDE_GLASS: 'DS',
} as const;

// ─── Insurance Company Codes ───
export const INSURANCE_COMPANIES = [
  { code: 'SAF', name: 'Safelite Solutions', ediEnabled: true },
  { code: 'LYN', name: 'Lynx Services', ediEnabled: true },
  { code: 'HRS', name: 'Harmon Solutions', ediEnabled: true },
  { code: 'TPA', name: 'TPA Solutions', ediEnabled: true },
  { code: 'NET', name: 'Glass.net', ediEnabled: true },
  { code: 'STA', name: 'State Farm', ediEnabled: true },
  { code: 'ALL', name: 'Allstate', ediEnabled: true },
  { code: 'PRG', name: 'Progressive', ediEnabled: true },
  { code: 'GEI', name: 'GEICO', ediEnabled: true },
  { code: 'USR', name: 'USAA', ediEnabled: true },
  { code: 'FRM', name: 'Farmers', ediEnabled: true },
  { code: 'LIB', name: 'Liberty Mutual', ediEnabled: true },
  { code: 'NAT', name: 'Nationwide', ediEnabled: true },
  { code: 'TRV', name: 'Travelers', ediEnabled: true },
  { code: 'AMF', name: 'American Family', ediEnabled: true },
  { code: 'ERI', name: 'Erie Insurance', ediEnabled: true },
  { code: 'OTH', name: 'Other', ediEnabled: false },
  { code: 'CSH', name: 'Cash / No Insurance', ediEnabled: false },
] as const;

// ─── Tax Rates ───
export const DEFAULT_TAX_RATE = 0.0;
export const GLASS_TAX_EXEMPT_STATES = ['MT', 'OR', 'NH', 'DE'];

// ─── Pricing ───
export const DEFAULT_LABOR_RATE = 50.0;
export const DEFAULT_SHOP_SUPPLY_FEE = 15.0;
export const URETHANE_KIT_COST = 25.0;
export const MOLDING_MARKUP = 1.35;
export const PARTS_MARKUP = 1.45;

// ─── Schedule ───
export const SCHEDULE_SLOTS = {
  morning: { start: '08:00', end: '12:00', label: 'Morning (8AM-12PM)' },
  midday: { start: '11:00', end: '14:00', label: 'Midday (11AM-2PM)' },
  afternoon: { start: '13:00', end: '17:00', label: 'Afternoon (1PM-5PM)' },
  all_day: { start: '08:00', end: '17:00', label: 'All Day (8AM-5PM)' },
} as const;

// ─── Job Duration Estimates (minutes) ───
export const JOB_DURATION_ESTIMATES: Record<string, number> = {
  replacement: 90,
  repair: 30,
  calibration: 60,
  tint: 120,
  chip_repair: 20,
  rear_glass: 75,
  side_glass: 60,
  quarter_glass: 45,
  sunroof: 120,
};

// ─── POS Receipt ───
export const RECEIPT_FOOTER = 'Thank you for choosing our auto glass services!';
export const WARRANTY_TEXT = 'Lifetime warranty on workmanship. Manufacturer warranty on glass.';

// ─── EDI Constants ───
export const EDI_SENDER_ID = 'AUTOGLASSPOD';
export const EDI_VERSION = '005010';
export const EDI_SEGMENT_TERMINATOR = '~';
export const EDI_ELEMENT_SEPARATOR = '*';
export const EDI_SUB_ELEMENT_SEPARATOR = ':';
