// Споделени типове от Backend

export interface User {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'user';
}

export interface CreateUserRequest {
  name: string;
  email: string;
  role?: 'admin' | 'user';
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  inStock?: boolean;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  price: number;
  inStock?: boolean;
}

export interface Order {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  total: number;
  status?: 'pending' | 'processing' | 'completed' | 'cancelled';
}

export interface CreateOrderRequest {
  userId: string;
  productId: string;
  quantity: number;
}
