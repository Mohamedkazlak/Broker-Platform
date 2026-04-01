import api from '@/lib/api';
import { Property } from '@/components/properties/PropertyCard';

export interface PropertyFilters {
    broker_id?: string;
    status?: string;
    property_type?: string;
    limit?: number;
    offset?: number;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
}

export const propertyService = {
    async getAll(filters?: PropertyFilters): Promise<Property[]> {
        const params = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    params.append(key, String(value));
                }
            });
        }

        const response = await api.get(`/properties?${params.toString()}`);
        return response.data.data; // Backend returns { status: 'success', data: [...] }
    },

    async getById(id: string): Promise<Property> {
        const response = await api.get(`/properties/${id}`);
        return response.data.data;
    },

    async create(data: Partial<Property>): Promise<Property> {
        const response = await api.post('/properties', data);
        return response.data.data;
    },

    async update(id: string, data: Partial<Property>): Promise<Property> {
        const response = await api.patch(`/properties/${id}`, data);
        return response.data.data;
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/properties/${id}`);
    }
};
