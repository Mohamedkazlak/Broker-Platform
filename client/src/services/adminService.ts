import api from "@/lib/api";

export interface AdminDashboardStats {
  totalBrokers: number;
  activeBrokers: number;
  pendingBrokers: number;
  newBrokersThisMonth: number;
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
};
