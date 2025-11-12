// Export generated types and API client
export * from './generated/data-contracts';
export { Api } from './generated/Api';
export { HttpClient } from './generated/http-client';

// Create API instance
import { Api } from './generated/Api';

export const api = new Api({
  baseURL: 'http://localhost:3000',
});

// Convenience exports for common operations
export const usersApi = {
  getAll: () => api.usersList(),
  getById: (id: string) => api.usersDetail({ id }),
  create: (data: Parameters<typeof api.usersCreate>[0]) => api.usersCreate(data),
};

export const productsApi = {
  getAll: () => api.productsList(),
  create: (data: Parameters<typeof api.productsCreate>[0]) => api.productsCreate(data),
};

export const ordersApi = {
  getAll: () => api.ordersList(),
  create: (data: Parameters<typeof api.ordersCreate>[0]) => api.ordersCreate(data),
};
