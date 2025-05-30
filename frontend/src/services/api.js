import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        // You can add auth tokens here if needed
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Handle common errors
        if (error.response?.status === 401) {
            // Redirect to login if unauthorized
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API calls
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    logout: () => api.post('/auth/logout'),
    checkSession: () => api.get('/auth/session'),
    register: (userData) => api.post('/auth/register', userData),
};

// Spare Parts API calls
export const sparePartsAPI = {
    getAll: () => api.get('/spare-parts'),
    getById: (name) => api.get(`/spare-parts/${encodeURIComponent(name)}`),
    create: (data) => api.post('/spare-parts', data),
    update: (name, data) => api.put(`/spare-parts/${encodeURIComponent(name)}`, data),
    delete: (name) => api.delete(`/spare-parts/${encodeURIComponent(name)}`),
};

// Stock In API calls
export const stockInAPI = {
    getAll: () => api.get('/stock-in'),
    getBySparePartName: (name) => api.get(`/stock-in/spare-part/${encodeURIComponent(name)}`),
    create: (data) => api.post('/stock-in', data),
    update: (id, data) => api.put(`/stock-in/${id}`, data),
    delete: (id) => api.delete(`/stock-in/${id}`),
};

// Stock Out API calls
export const stockOutAPI = {
    getAll: () => api.get('/stock-out'),
    getById: (id) => api.get(`/stock-out/${id}`),
    getBySparePartName: (name) => api.get(`/stock-out/spare-part/${encodeURIComponent(name)}`),
    create: (data) => api.post('/stock-out', data),
    update: (id, data) => api.put(`/stock-out/${id}`, data),
    delete: (id) => api.delete(`/stock-out/${id}`),
};

// Reports API calls
export const reportsAPI = {
    getDailyStockOut: (date) => api.get('/reports/daily-stock-out', { params: { date } }),
    getStockStatus: () => api.get('/reports/stock-status'),
    getStockMovement: (sparePartName, startDate, endDate) => 
        api.get(`/reports/stock-movement/${encodeURIComponent(sparePartName)}`, { 
            params: { startDate, endDate } 
        }),
    getMonthlySummary: (year, month) => 
        api.get('/reports/monthly-summary', { params: { year, month } }),
};

// Health check
export const healthAPI = {
    check: () => api.get('/health'),
};

export default api;
