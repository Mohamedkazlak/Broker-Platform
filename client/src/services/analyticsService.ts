import api from '@/lib/api';

export interface AnalyticsSummary {
    viewsThisMonth: number;
    viewsLastMonth: number;
    total: number;
    percentVsLastMonth: number;
}

export interface TopPropertyRow {
    property_id: string;
    views: number;
}

export const analyticsService = {
    async getSummary(): Promise<AnalyticsSummary> {
        const response = await api.get<{ status: string; data: AnalyticsSummary }>('/analytics/summary');
        return response.data.data;
    },

    async getViews(days = 30): Promise<{ data: unknown[]; total: number }> {
        const response = await api.get<{ status: string; data: unknown[]; total: number }>(`/analytics/views?days=${days}`);
        return { data: response.data.data, total: response.data.total };
    },

    async getTopProperties(limit = 10, days = 30): Promise<TopPropertyRow[]> {
        const response = await api.get<{ status: string; data: TopPropertyRow[] }>(
            `/analytics/top-properties?limit=${limit}&days=${days}`
        );
        return response.data.data;
    },
};
