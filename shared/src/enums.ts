// ─── Work Order Status Flow (Omega-style) ───
export enum WorkOrderStatus {
  QUOTE = 'quote',
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  DISPATCHED = 'dispatched',
  EN_ROUTE = 'en_route',
  ON_SITE = 'on_site',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  INVOICED = 'invoiced',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold',
}

// ─── Job Types ───
export enum JobType {
  REPLACEMENT = 'replacement',
  REPAIR = 'repair',
  CALIBRATION = 'calibration',
  TINT = 'tint',
  CHIP_REPAIR = 'chip_repair',
  REAR_GLASS = 'rear_glass',
  SIDE_GLASS = 'side_glass',
  QUARTER_GLASS = 'quarter_glass',
  SUNROOF = 'sunroof',
}

// ─── Glass Position ───
export enum GlassPosition {
  WINDSHIELD = 'windshield',
  REAR = 'rear',
  FRONT_LEFT = 'front_left',
  FRONT_RIGHT = 'front_right',
  REAR_LEFT = 'rear_left',
  REAR_RIGHT = 'rear_right',
  QUARTER_LEFT = 'quarter_left',
  QUARTER_RIGHT = 'quarter_right',
  SUNROOF = 'sunroof',
  MOONROOF = 'moonroof',
}

// ─── Pod Status ───
export enum PodStatus {
  AVAILABLE = 'available',
  DISPATCHED = 'dispatched',
  EN_ROUTE = 'en_route',
  ON_SITE = 'on_site',
  RETURNING = 'returning',
  OFF_DUTY = 'off_duty',
  MAINTENANCE = 'maintenance',
  BREAK = 'break',
}

// ─── Payment Types (POS) ───
export enum PaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  CHECK = 'check',
  INSURANCE_DIRECT = 'insurance_direct',
  INSURANCE_COD = 'insurance_cod',
  FINANCING = 'financing',
  MOBILE_PAY = 'mobile_pay',
  SPLIT = 'split',
}

export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  SETTLED = 'settled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  VOIDED = 'voided',
  DECLINED = 'declined',
  FAILED = 'failed',
}

// ─── Insurance / Claim ───
export enum ClaimStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  ACKNOWLEDGED = 'acknowledged',
  APPROVED = 'approved',
  DENIED = 'denied',
  PENDING_INFO = 'pending_info',
  IN_REVIEW = 'in_review',
  PAID = 'paid',
  CLOSED = 'closed',
}

export enum EDITransactionType {
  ACKNOWLEDGMENT = '824',
  CLAIM_SUBMISSION = '837',
  REFERRAL = '271',
  PAYMENT_ADVICE = '835',
  STATUS_INQUIRY = '276',
  STATUS_RESPONSE = '277',
}

// ─── Inventory ───
export enum InventoryStatus {
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  ON_ORDER = 'on_order',
  IN_TRANSIT = 'in_transit',
  BACKORDERED = 'backordered',
  DISCONTINUED = 'discontinued',
}

export enum PartType {
  OEM = 'oem',
  OEE = 'oee',
  AFTERMARKET = 'aftermarket',
  DEALER = 'dealer',
  USED = 'used',
}

// ─── Schedule ───
export enum ScheduleSlot {
  MORNING = 'morning',
  MIDDAY = 'midday',
  AFTERNOON = 'afternoon',
  ALL_DAY = 'all_day',
  CUSTOM = 'custom',
}

// ─── User Roles ───
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  CSR = 'csr',
  TECHNICIAN = 'technician',
  DISPATCHER = 'dispatcher',
  ACCOUNTING = 'accounting',
  VIEWER = 'viewer',
}

// ─── Customer Source ───
export enum CustomerSource {
  WALK_IN = 'walk_in',
  PHONE = 'phone',
  WEBSITE = 'website',
  INSURANCE_REFERRAL = 'insurance_referral',
  FLEET = 'fleet',
  DEALER = 'dealer',
  REPEAT = 'repeat',
  REFERRAL = 'referral',
  ADVERTISING = 'advertising',
}

// ─── Invoice Status ───
export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  VOID = 'void',
  WRITE_OFF = 'write_off',
}

// ─── POS Transaction Type ───
export enum POSTransactionType {
  SALE = 'sale',
  REFUND = 'refund',
  VOID = 'void',
  EXCHANGE = 'exchange',
  DEPOSIT = 'deposit',
  BALANCE_DUE = 'balance_due',
}

// ─── Notification Type ───
export enum NotificationType {
  APPOINTMENT_REMINDER = 'appointment_reminder',
  TECH_EN_ROUTE = 'tech_en_route',
  JOB_COMPLETED = 'job_completed',
  INVOICE_READY = 'invoice_ready',
  PAYMENT_RECEIVED = 'payment_received',
  CLAIM_UPDATE = 'claim_update',
  SCHEDULE_CHANGE = 'schedule_change',
  LOW_INVENTORY = 'low_inventory',
}
