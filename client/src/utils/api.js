import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
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
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Strategy APIs
export const strategyAPI = {
  getAll: () => api.get('/strategy'),
  getOne: (id) => api.get(`/strategy/${id}`),
  create: (data) => api.post('/strategy', data),
  update: (id, data) => api.put(`/strategy/${id}`, data),
  delete: (id) => api.delete(`/strategy/${id}`),
  toggle: (id) => api.patch(`/strategy/${id}/toggle`),
};

// Trading APIs
export const tradingAPI = {
  execute: (strategyId, isSimulated) => api.post('/trading/execute', { strategyId, isSimulated }),
  close: (orderId, isSimulated) => api.post('/trading/close', { orderId, isSimulated }),
  monitor: () => api.post('/trading/monitor'),
};

// Backtest APIs
export const backtestAPI = {
  run: (data) => api.post('/backtest/run', data),
  getAll: () => api.get('/backtest'),
  getOne: (id) => api.get(`/backtest/${id}`),
  delete: (id) => api.delete(`/backtest/${id}`),
};

// AI Analysis APIs
export const aiAPI = {
  analyze: (symbol, strategyId) => api.post('/ai-analysis/analyze', { symbol, strategyId }),
  sentiment: (symbol, newsData) => api.post('/ai-analysis/sentiment', { symbol, newsData }),
};

// Order APIs
export const orderAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getOne: (id) => api.get(`/orders/${id}`),
  getStats: (isSimulated) => api.get('/orders/stats/summary', { params: { isSimulated } }),
};

// Account APIs
export const accountAPI = {
  getAll: (accountType) => api.get('/account', { params: { accountType } }),
  getBinanceBalance: () => api.get('/account/binance/balance'),
  create: (data) => api.post('/account', data),
  update: (id, data) => api.put(`/account/${id}`, data),
};

// Status APIs
export const statusAPI = {
  getAll: () => api.get('/status/all'),
  getAI: () => api.get('/status/ai'),
  getBinance: () => api.get('/status/binance'),
};

// System Config APIs
export const systemConfigAPI = {
  get: () => api.get('/system-config'),
  update: (data) => api.put('/system-config', data),
  reset: () => api.post('/system-config/reset'),
};

// Data Cache APIs
export const dataCacheAPI = {
  getStats: () => api.get('/data-cache/stats'),
  getDetails: (symbol, interval) => api.get(`/data-cache/${symbol}/${interval}`),
  warmup: (symbols, intervals, days) => api.post('/data-cache/warmup', { symbols, intervals, days }),
  update: (symbol, interval) => api.post('/data-cache/update', { symbol, interval }),
  refresh: (symbol, interval, startDate, endDate, days) => api.post('/data-cache/refresh', { symbol, interval, startDate, endDate, days }),
  clear: (symbol, interval) => api.delete('/data-cache/clear', { params: { symbol, interval } }),
};

// Health check
export const healthCheck = () => api.get('/health');

export default api;

