import {
  WorkOrderStatus, JobType, GlassPosition, PodStatus,
  PaymentMethod, PaymentStatus, ClaimStatus, InventoryStatus,
  PartType, UserRole, CustomerSource, InvoiceStatus,
  POSTransactionType, ScheduleSlot, NotificationType,
} from './enums';

// ─── Base ───
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Auth ───
export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  podId?: string;
  shopId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ─── Shop / Location ───
export interface Shop extends BaseEntity {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  fein?: string;
  nagsId?: string;
  timezone: string;
  isActive: boolean;
  taxRate: number;
  laborRate: number;
}

// ─── Customer ───
export interface Customer extends BaseEntity {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  altPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  company?: string;
  source: CustomerSource;
  isFleet: boolean;
  notes?: string;
  totalJobs: number;
  totalRevenue: number;
}

// ─── Vehicle ───
export interface Vehicle extends BaseEntity {
  customerId: string;
  vin?: string;
  year: number;
  make: string;
  model: string;
  subModel?: string;
  bodyStyle?: string;
  color?: string;
  plateNumber?: string;
  plateState?: string;
  nagsVehicleId?: string;
}

// ─── Work Order ───
export interface WorkOrder extends BaseEntity {
  orderNumber: string;
  shopId: string;
  customerId: string;
  vehicleId: string;
  podId?: string;
  technicianId?: string;
  status: WorkOrderStatus;
  jobType: JobType;
  glassPosition: GlassPosition;
  scheduledDate?: string;
  scheduledSlot?: ScheduleSlot;
  scheduledTime?: string;
  serviceLocation: 'shop' | 'mobile' | 'customer';
  serviceAddress?: string;
  serviceCity?: string;
  serviceState?: string;
  serviceZip?: string;
  nagsPartNumber?: string;
  partDescription?: string;
  partType: PartType;
  glassVendor?: string;
  // Pricing
  retailPrice: number;
  partCost: number;
  laborCost: number;
  moldingCost: number;
  kitCost: number;
  otherCharges: number;
  discount: number;
  taxAmount: number;
  totalAmount: number;
  // Insurance
  isInsuranceJob: boolean;
  insuranceCompanyCode?: string;
  claimNumber?: string;
  policyNumber?: string;
  deductible: number;
  insurancePays: number;
  customerPays: number;
  // ADAS Calibration
  requiresCalibration: boolean;
  calibrationType?: 'static' | 'dynamic' | 'both';
  calibrationCost: number;
  // Notes
  csrNotes?: string;
  techNotes?: string;
  dispatchNotes?: string;
  // Timestamps
  dispatchedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  // Relations
  customer?: Customer;
  vehicle?: Vehicle;
  pod?: Pod;
  technician?: User;
  invoice?: Invoice;
  claim?: InsuranceClaim;
  lineItems?: WorkOrderLineItem[];
}

export interface WorkOrderLineItem extends BaseEntity {
  workOrderId: string;
  description: string;
  nagsPartNumber?: string;
  partType?: PartType;
  quantity: number;
  unitPrice: number;
  cost: number;
  total: number;
  isTaxable: boolean;
  category: 'glass' | 'molding' | 'hardware' | 'urethane' | 'labor' | 'calibration' | 'other';
}

// ─── Pod (Mobile Service Unit) ───
export interface Pod extends BaseEntity {
  name: string;
  vehicleId?: string;
  vehiclePlate?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  shopId: string;
  status: PodStatus;
  currentLat?: number;
  currentLng?: number;
  lastLocationUpdate?: string;
  maxJobsPerDay: number;
  serviceRadius: number;
  isActive: boolean;
  technicians?: User[];
  todayJobs?: WorkOrder[];
}

// ─── Schedule ───
export interface ScheduleEntry extends BaseEntity {
  workOrderId: string;
  podId?: string;
  technicianId?: string;
  shopId: string;
  date: string;
  slot: ScheduleSlot;
  startTime: string;
  endTime: string;
  estimatedDuration: number;
  isConfirmed: boolean;
  workOrder?: WorkOrder;
  pod?: Pod;
  technician?: User;
}

// ─── Inventory ───
export interface InventoryItem extends BaseEntity {
  shopId: string;
  nagsPartNumber: string;
  description: string;
  partType: PartType;
  glassPosition?: GlassPosition;
  quantity: number;
  minQuantity: number;
  cost: number;
  retailPrice: number;
  vendor?: string;
  location?: string;
  status: InventoryStatus;
  lastOrderedAt?: string;
  fitsVehicles?: string[];
}

// ─── Insurance / Claims (EDI) ───
export interface InsuranceClaim extends BaseEntity {
  workOrderId: string;
  claimNumber: string;
  policyNumber: string;
  insuranceCompanyCode: string;
  insuranceCompanyName: string;
  adjusterName?: string;
  adjusterPhone?: string;
  adjusterEmail?: string;
  dateOfLoss: string;
  status: ClaimStatus;
  approvalNumber?: string;
  // Pricing from insurance
  approvedAmount: number;
  deductible: number;
  customerResponsibility: number;
  // EDI
  ediReferralId?: string;
  ediLastTransactionType?: string;
  ediLastTransactionDate?: string;
  ediMessages?: EDIMessage[];
  // Waiver
  deductibleWaiver: boolean;
  waiverAmount: number;
  notes?: string;
}

export interface EDIMessage extends BaseEntity {
  claimId: string;
  transactionType: string;
  direction: 'inbound' | 'outbound';
  rawContent: string;
  parsedData?: Record<string, unknown>;
  status: 'sent' | 'received' | 'processed' | 'error';
  errorMessage?: string;
}

// ─── Invoice ───
export interface Invoice extends BaseEntity {
  invoiceNumber: string;
  workOrderId: string;
  customerId: string;
  shopId: string;
  status: InvoiceStatus;
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  dueDate: string;
  paidDate?: string;
  notes?: string;
  lineItems?: InvoiceLineItem[];
  payments?: Payment[];
}

export interface InvoiceLineItem extends BaseEntity {
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isTaxable: boolean;
}

// ─── POS / Payments ───
export interface Payment extends BaseEntity {
  invoiceId: string;
  shopId: string;
  transactionType: POSTransactionType;
  paymentMethod: PaymentMethod;
  amount: number;
  tipAmount: number;
  processingFee: number;
  netAmount: number;
  status: PaymentStatus;
  referenceNumber?: string;
  authorizationCode?: string;
  cardLast4?: string;
  cardBrand?: string;
  checkNumber?: string;
  receiptNumber: string;
  processedBy: string;
  processedAt: string;
  voidedAt?: string;
  voidedBy?: string;
  refundReason?: string;
  notes?: string;
}

export interface POSSession extends BaseEntity {
  shopId: string;
  userId: string;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  closingBalance?: number;
  cashSales: number;
  cardSales: number;
  checkSales: number;
  totalSales: number;
  totalRefunds: number;
  netSales: number;
  transactionCount: number;
  isOpen: boolean;
}

export interface CashDrawer extends BaseEntity {
  sessionId: string;
  type: 'open' | 'close' | 'drop' | 'paid_in' | 'paid_out';
  amount: number;
  reason?: string;
  performedBy: string;
  performedAt: string;
}

// ─── Quote ───
export interface Quote extends BaseEntity {
  quoteNumber: string;
  customerId?: string;
  shopId: string;
  vehicleYear: number;
  vehicleMake: string;
  vehicleModel: string;
  glassPosition: GlassPosition;
  jobType: JobType;
  nagsPartNumber?: string;
  partDescription?: string;
  partType: PartType;
  partCost: number;
  laborCost: number;
  moldingCost: number;
  kitCost: number;
  calibrationCost: number;
  otherCharges: number;
  discount: number;
  taxAmount: number;
  totalAmount: number;
  isInsuranceJob: boolean;
  deductible: number;
  customerPays: number;
  insurancePays: number;
  validUntil: string;
  isConverted: boolean;
  convertedWorkOrderId?: string;
  notes?: string;
}

// ─── Notification ───
export interface Notification extends BaseEntity {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

// ─── Reporting ───
export interface DashboardStats {
  todayJobs: number;
  todayRevenue: number;
  pendingJobs: number;
  activePods: number;
  openClaims: number;
  overdueInvoices: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  averageJobValue: number;
  completionRate: number;
}

export interface RevenueReport {
  period: string;
  totalRevenue: number;
  insuranceRevenue: number;
  cashRevenue: number;
  laborRevenue: number;
  partsRevenue: number;
  calibrationRevenue: number;
  jobCount: number;
  averageTicket: number;
}

export interface TechnicianPerformance {
  technicianId: string;
  technicianName: string;
  jobsCompleted: number;
  totalRevenue: number;
  averageJobTime: number;
  customerRating: number;
  callbackRate: number;
}

// ─── API Response Types ───
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  error: string;
  details?: Record<string, string[]>;
}
