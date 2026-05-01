import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
    headers: {
        'ngrok-skip-browser-warning': 'true',
    },
});

// Request interceptor — attach JWT token
// Request interceptor — can be used for other purposes if needed
api.interceptors.request.use(
    (config) => config,
    (error) => Promise.reject(error)
);

// Response interceptor — handle 401 (redirect to login) and global errors
let reportGlobalError = null;

export const setupErrorInterceptor = (reportErrorFn) => {
    reportGlobalError = reportErrorFn;
};

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        
        if (status === 401) {
            // Token is invalid/expired
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        } else if (status >= 500 || error.code === 'ERR_NETWORK') {
            // Trigger global error UI for 500s or network failures
            if (reportGlobalError) {
                const message = error.response?.data?.error || error.message || 'Unknown Server Error';
                reportGlobalError(message, {
                    url: error.config?.url,
                    method: error.config?.method,
                    status: status
                });
            }
        }
        
        return Promise.reject(error);
    }
);

export default api;
