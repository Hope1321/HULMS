export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Chemical {
  id: string;
  name: string;
  hazardLevel: string;
}

export interface Unit {
  id: string;
  name: string;
  symbol: string;
}

export interface RequestItem {
  id: string;
  requestedQty: string;
  approvedQty: string | null;
  notes: string | null;
  requestId: string;
  chemicalId: string;
  unitId: string;
  createdAt: string;
  updatedAt: string;
  chemical: Chemical;
  unit: Unit;
}

export interface ChemicalRequest {
  id: string;
  requestNumber: string;
  purpose: string;
  requiredDate: string | null;
  status: string;
  notes: string | null;
  requestedById: string;
  createdAt: string;
  updatedAt: string;
  requestedBy: User;
  items: RequestItem[];
}

export interface Batch {
  id: string;
  batchNumber: string;
  quantity: string;
  status: string;
  chemical: Chemical;
  unit: Unit;
}

export interface Issuance {
  id: string;
  issuanceNumber: string;
  quantity: string;
  status: string;
  issuedAt: string | null;
  notes: string | null;
  requestId: string;
  batchId: string;
  issuedToId: string;
  issuedById: string;
  createdAt: string;

  request: {
    id: string;
    requestNumber: string;
    purpose: string;
    status: string;
  };

  batch: Batch;

  issuedTo: User;
  issuedBy: User;
}

export interface Alert {
  id: string;
  type: string;
  status: string;
  title: string;
  message: string | null;
  chemicalId: string | null;
  batchId: string | null;
  createdAt: string;
  resolvedAt: string | null;

  chemical: Chemical | null;

  batch: {
    id: string;
    batchNumber: string;
    quantity: string;
    minimumStock: string;
    expiryDate: string | null;
    status: string;
  } | null;
}

export interface DashboardSummary {
  chemicals: {
    total: number;
    active: number;
  };

  batches: {
    total: number;
    lowStock: number;
    expired: number;
  };

  requests: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };

  issuances: {
    total: number;
  };

  alerts: {
    active: number;
  };

  notifications: {
    unread: number;
  };

  users: {
    total: number;
  };

  laboratories: {
    total: number;
  };
}

export interface DashboardData {
  summary: DashboardSummary;
  recentRequests: ChemicalRequest[];
  recentIssuances: Issuance[];
  recentAlerts: Alert[];
}

export interface DashboardResponse {
  success: boolean;
  message: string;
  data: DashboardData;
}

// Type aliases used by dashboard components
export type DashboardAlert = Alert;
export type DashboardIssuance = Issuance;
export type DashboardRequest = ChemicalRequest;
