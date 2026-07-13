import api from "@/lib/api";

export interface AdminDashboardStats {
  totalBrokers: number;
  activeBrokers: number;
  pendingBrokers: number;
  newBrokersThisMonth: number;
  pendingInstapayReviews: number;
}

export type BrokerStatus =
  | "active"
  | "pending"
  | "suspended"
  | "past_due"
  | string;

export interface BrokerSummary {
  id: string;
  name: string;
  contactName: string | null;
  email: string;
  subdomain: string;
  customDomain: string | null;
  plan: string;
  status: BrokerStatus;
  signupDate: string;
}

export interface BrokerDetail {
  id: string;
  firstName: string;
  lastName: string;
  platformName: string;
  email: string;
  phoneNumber: string | null;
  whatsappNumber: string | null;
  governorate: string | null;
  subdomain: string;
  customDomain: string | null;
  domainType: string;
  plan: string;
  packageLimit: number;
  status: BrokerStatus;
  isActive: boolean;
  subscriptionStatus: string;
  signupDate: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListBrokersParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface InstapayBrokerInfo {
  id: string | null;
  platformName: string;
  email: string;
  contactName: string | null;
  plan: string;
  subdomain: string;
}

export interface InstapaySubmission {
  id: string;
  brokerId: string | null;
  amount: number;
  currency: string;
  status: "pending_review" | "approved" | "rejected";
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  receiptUrl?: string | null;
  broker: InstapayBrokerInfo | null;
}

export interface ListInstapayParams {
  status?: string;
  page?: number;
  limit?: number;
}

export const adminService = {
  async getDashboardStats(): Promise<AdminDashboardStats> {
    const { data } = await api.get("/admin/dashboard-stats");
    return data.data;
  },

  async listBrokers(
    params: ListBrokersParams = {},
  ): Promise<{ brokers: BrokerSummary[]; pagination: Pagination }> {
    const { data } = await api.get("/admin/brokers", { params });
    return { brokers: data.data, pagination: data.pagination };
  },

  async getBroker(brokerId: string): Promise<BrokerDetail> {
    const { data } = await api.get(`/admin/brokers/${brokerId}`);
    return data.data;
  },

  async updateBrokerStatus(
    brokerId: string,
    status: "active" | "suspended",
  ): Promise<{ id: string; status: BrokerStatus; isActive: boolean }> {
    const { data } = await api.patch(`/admin/brokers/${brokerId}/status`, {
      status,
    });
    return data.data;
  },

  async listInstapay(
    params: ListInstapayParams = {},
  ): Promise<{ submissions: InstapaySubmission[]; pagination: Pagination }> {
    const { data } = await api.get("/admin/instapay", { params });
    return { submissions: data.data, pagination: data.pagination };
  },

  async reviewInstapay(
    id: string,
    body: { action: "approve" | "reject"; rejectionReason?: string },
  ): Promise<InstapaySubmission> {
    const { data } = await api.patch(`/admin/instapay/${id}`, body);
    return data.data;
  },
};
