import axios from 'axios';
import { supabase } from '@/integrations/supabase/client';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle global errors (e.g. 401 Unauthorized)
        if (error.response?.status === 401) {
            // Redirect to login or refresh token?
            // Supabase client handles session refresh automatically, 
            // so if we get 401 here, the session is likely invalid.
        }
        return Promise.reject(error);
    }
);

export default api;
