/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface User {
  /** User ID */
  id: string;
  /** User name */
  name: string;
  /**
   * User email
   * @format email
   */
  email: string;
  /** User role */
  role?: "admin" | "user";
}

export interface CreateUserRequest {
  /** User name */
  name: string;
  /**
   * User email
   * @format email
   */
  email: string;
  /** User role */
  role?: "admin" | "user";
}

export interface Product {
  /** Product ID */
  id: string;
  /** Product name */
  name: string;
  /** Product description */
  description?: string;
  /**
   * Product price
   * @format float
   */
  price: number;
  /** Is product in stock */
  inStock?: boolean;
}

export interface CreateProductRequest {
  /** Product name */
  name: string;
  /** Product description */
  description?: string;
  /**
   * Product price
   * @format float
   */
  price: number;
  /** Is product in stock */
  inStock?: boolean;
}

export interface Order {
  /** Order ID */
  id: string;
  /** User ID */
  customerId: string;
  /** Product ID */
  productId: string;
  /** Quantity */
  quantity: number;
  /**
   * Total price
   * @format float
   */
  total: number;
  /** Order status */
  status?: "pending" | "processing" | "completed" | "cancelled";
}

export interface CreateOrderRequest {
  /** User ID */
  customerId: string;
  /** Product ID */
  productId: string;
  /** Quantity */
  quantity: number;
}

export type UsersListData = User[];

export type UsersCreateData = User;

export interface UsersDetailParams {
  id: string;
}

export type UsersDetailData = User;

export type ProductsListData = Product[];

export type ProductsCreateData = Product;

export type OrdersListData = Order[];

export type OrdersCreateData = Order;
