import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize errors; auto-logout on 401 (expired / invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.reload(); // App re-mounts → shows Login page
    }
    const message =
      error?.response?.data?.detail ||
      error?.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

// Auth
export const loginUser = (username, password) =>
  api.post('/auth/login', { username, password }).then((r) => r.data);

// Batches
export const getBatches = (includeEmpty = false) =>
  api.get(`/batches?include_empty=${includeEmpty}`).then((r) => r.data);

export const createBatch = (data) =>
  api.post('/batches', data).then((r) => r.data);

export const deleteBatch = (id) =>
  api.delete(`/batches/${id}`).then((r) => r.data);

export const adjustStock = (id, data) =>
  api.post(`/batches/${id}/adjust-stock`, data).then((r) => r.data);

// Clients
export const getClients = () =>
  api.get('/clients').then((r) => r.data);

export const createClient = (data) =>
  api.post('/clients', data).then((r) => r.data);

export const getClientOutstanding = (clientId) =>
  api.get(`/clients/${clientId}/outstanding`).then((r) => r.data);

export const getClientLedger = (clientId) =>
  api.get(`/clients/${clientId}/ledger`).then((r) => r.data);

// Orders
export const getOrders = () =>
  api.get('/orders').then((r) => r.data);

export const createOrder = (data) =>
  api.post('/orders', data).then((r) => r.data);

export const getOrder = (id) =>
  api.get(`/orders/${id}`).then((r) => r.data);

export const updatePayment = (orderId, status) =>
  api.patch(`/orders/${orderId}/payment`, { payment_status: status }).then((r) => r.data);

export const cancelOrder = (orderId) =>
  api.patch(`/orders/${orderId}/cancel`).then((r) => r.data);

// Dispatch
export const dispatch = (orderId) =>
  api.post('/dispatch', { order_id: orderId }).then((r) => r.data);

// Activity Logs
export const getLogs = ({ limit = 50, entity_type, action_type } = {}) => {
  const params = new URLSearchParams({ limit });
  if (entity_type) params.append('entity_type', entity_type);
  if (action_type) params.append('action_type', action_type);
  return api.get(`/logs?${params.toString()}`).then((r) => r.data);
};
