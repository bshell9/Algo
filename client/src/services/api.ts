import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
          useAuthStore.getState().setTokens(data.data.accessToken, data.data.refreshToken);
          error.config.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return axios(error.config);
        } catch {
          useAuthStore.getState().logout();
        }
      } else {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth ───
export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// ─── Shops ───
export const shopAPI = {
  list: () => api.get('/shops'),
  get: (id: string) => api.get(`/shops/${id}`),
  create: (data: any) => api.post('/shops', data),
  update: (id: string, data: any) => api.put(`/shops/${id}`, data),
};

// ─── Customers ───
export const customerAPI = {
  list: (params?: any) => api.get('/customers', { params }),
  get: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
  vehicles: (id: string) => api.get(`/customers/${id}/vehicles`),
};

// ─── Vehicles ───
export const vehicleAPI = {
  list: (params?: any) => api.get('/vehicles', { params }),
  get: (id: string) => api.get(`/vehicles/${id}`),
  create: (data: any) => api.post('/vehicles', data),
  update: (id: string, data: any) => api.put(`/vehicles/${id}`, data),
  vinLookup: (vin: string) => api.get(`/vehicles/lookup/vin/${vin}`),
};

// ─── Work Orders ───
export const workOrderAPI = {
  list: (params?: any) => api.get('/work-orders', { params }),
  get: (id: string) => api.get(`/work-orders/${id}`),
  create: (data: any) => api.post('/work-orders', data),
  update: (id: string, data: any) => api.put(`/work-orders/${id}`, data),
  updateStatus: (id: string, status: string) => api.put(`/work-orders/${id}/status`, { status }),
  dispatch: (id: string, data: any) => api.post(`/work-orders/${id}/dispatch`, data),
  addLineItem: (id: string, data: any) => api.post(`/work-orders/${id}/line-items`, data),
  deleteLineItem: (id: string, itemId: string) => api.delete(`/work-orders/${id}/line-items/${itemId}`),
};

// ─── Pods ───
export const podAPI = {
  list: (params?: any) => api.get('/pods', { params }),
  get: (id: string) => api.get(`/pods/${id}`),
  create: (data: any) => api.post('/pods', data),
  update: (id: string, data: any) => api.put(`/pods/${id}`, data),
  updateStatus: (id: string, status: string) => api.put(`/pods/${id}/status`, { status }),
  updateLocation: (id: string, lat: number, lng: number) => api.put(`/pods/${id}/location`, { lat, lng }),
  todayJobs: (id: string) => api.get(`/pods/${id}/today`),
};

// ─── Schedule ───
export const scheduleAPI = {
  list: (params?: any) => api.get('/schedule', { params }),
  create: (data: any) => api.post('/schedule', data),
  update: (id: string, data: any) => api.put(`/schedule/${id}`, data),
  delete: (id: string) => api.delete(`/schedule/${id}`),
  availability: (params: any) => api.get('/schedule/availability', { params }),
};

// ─── Inventory ───
export const inventoryAPI = {
  list: (params?: any) => api.get('/inventory', { params }),
  allShops: (partNumber: string) => api.get(`/inventory/all-shops/${partNumber}`),
  create: (data: any) => api.post('/inventory', data),
  update: (id: string, data: any) => api.put(`/inventory/${id}`, data),
  adjust: (id: string, adjustment: number, reason: string) => api.put(`/inventory/${id}/adjust`, { adjustment, reason }),
  lowStockAlerts: () => api.get('/inventory/low-stock/alerts'),
  transfers: (params?: any) => api.get('/inventory/transfers', { params }),
  createTransfer: (data: any) => api.post('/inventory/transfers', data),
  shipTransfer: (id: string) => api.put(`/inventory/transfers/${id}/ship`),
  receiveTransfer: (id: string) => api.put(`/inventory/transfers/${id}/receive`),
  purchaseOrders: (params?: any) => api.get('/inventory/purchase-orders', { params }),
  createPO: (data: any) => api.post('/inventory/purchase-orders', data),
  receivePO: (id: string) => api.put(`/inventory/purchase-orders/${id}/receive`),
};

// ─── NAGS ───
export const nagsAPI = {
  searchParts: (params?: any) => api.get('/nags/parts', { params }),
  getPart: (partNumber: string) => api.get(`/nags/parts/${partNumber}`),
  createPart: (data: any) => api.post('/nags/parts', data),
  updatePart: (id: string, data: any) => api.put(`/nags/parts/${id}`, data),
  lookup: (params: any) => api.get('/nags/lookup', { params }),
  makes: () => api.get('/nags/makes'),
  models: (make: string) => api.get(`/nags/models/${make}`),
};

// ─── Claims ───
export const claimAPI = {
  list: (params?: any) => api.get('/claims', { params }),
  get: (id: string) => api.get(`/claims/${id}`),
  create: (data: any) => api.post('/claims', data),
  update: (id: string, data: any) => api.put(`/claims/${id}`, data),
  updateStatus: (id: string, data: any) => api.put(`/claims/${id}/status`, data),
  submitEDI: (id: string) => api.post(`/claims/${id}/edi/submit`),
};

// ─── Invoices ───
export const invoiceAPI = {
  list: (params?: any) => api.get('/invoices', { params }),
  get: (id: string) => api.get(`/invoices/${id}`),
  createFromWorkOrder: (workOrderId: string) => api.post(`/invoices/from-work-order/${workOrderId}`),
  update: (id: string, data: any) => api.put(`/invoices/${id}`, data),
  void: (id: string) => api.put(`/invoices/${id}/void`),
};

// ─── POS ───
export const posAPI = {
  sessions: (params?: any) => api.get('/pos/sessions', { params }),
  openSession: (data: any) => api.post('/pos/sessions/open', data),
  closeSession: (id: string, closingBalance: number) => api.post(`/pos/sessions/${id}/close`, { closingBalance }),
  sessionSummary: (id: string) => api.get(`/pos/sessions/${id}/receipt-summary`),
  processPayment: (data: any) => api.post('/pos/payments', data),
  splitPayment: (data: any) => api.post('/pos/payments/split', data),
  voidPayment: (id: string) => api.post(`/pos/payments/${id}/void`),
  refundPayment: (id: string, data: any) => api.post(`/pos/payments/${id}/refund`, data),
  cashDrop: (data: any) => api.post('/pos/cash-drawer/drop', data),
  paidIn: (data: any) => api.post('/pos/cash-drawer/paid-in', data),
  paidOut: (data: any) => api.post('/pos/cash-drawer/paid-out', data),
};

// ─── Quotes ───
export const quoteAPI = {
  list: (params?: any) => api.get('/quotes', { params }),
  get: (id: string) => api.get(`/quotes/${id}`),
  create: (data: any) => api.post('/quotes', data),
  update: (id: string, data: any) => api.put(`/quotes/${id}`, data),
  convert: (id: string, data: any) => api.post(`/quotes/${id}/convert`, data),
};

// ─── Dashboard ───
export const dashboardAPI = {
  stats: (params?: any) => api.get('/dashboard/stats', { params }),
  todaySchedule: (params?: any) => api.get('/dashboard/today-schedule', { params }),
  podStatus: () => api.get('/dashboard/pod-status'),
  recentActivity: () => api.get('/dashboard/recent-activity'),
};

// ─── Reports ───
export const reportAPI = {
  revenue: (params?: any) => api.get('/reports/revenue', { params }),
  techPerformance: (params?: any) => api.get('/reports/technician-performance', { params }),
  inventoryValue: () => api.get('/reports/inventory-value'),
  jobsByType: (params?: any) => api.get('/reports/jobs-by-type', { params }),
  insuranceSummary: () => api.get('/reports/insurance-summary'),
  posSummary: (params?: any) => api.get('/reports/pos-summary', { params }),
};
