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

import {
  CreateOrderRequest,
  CreateProductRequest,
  CreateUserRequest,
  OrdersCreateData,
  OrdersListData,
  ProductsCreateData,
  ProductsListData,
  UsersCreateData,
  UsersDetailData,
  UsersDetailParams,
  UsersListData,
} from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Api<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @tags Users
   * @name UsersList
   * @summary Get all users
   * @request GET:/api/users
   */
  usersList = (params: RequestParams = {}) =>
    this.request<UsersListData, any>({
      path: `/api/users`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Users
   * @name UsersCreate
   * @summary Create new user
   * @request POST:/api/users
   */
  usersCreate = (data: CreateUserRequest, params: RequestParams = {}) =>
    this.request<UsersCreateData, any>({
      path: `/api/users`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Users
   * @name UsersDetail
   * @summary Get user by ID
   * @request GET:/api/users/{id}
   */
  usersDetail = (
    { id, ...query }: UsersDetailParams,
    params: RequestParams = {},
  ) =>
    this.request<UsersDetailData, void>({
      path: `/api/users/${id}`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Products
   * @name ProductsList
   * @summary Get all products
   * @request GET:/api/products
   */
  productsList = (params: RequestParams = {}) =>
    this.request<ProductsListData, any>({
      path: `/api/products`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Products
   * @name ProductsCreate
   * @summary Create new product
   * @request POST:/api/products
   */
  productsCreate = (data: CreateProductRequest, params: RequestParams = {}) =>
    this.request<ProductsCreateData, any>({
      path: `/api/products`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Orders
   * @name OrdersList
   * @summary Get all orders
   * @request GET:/api/orders
   */
  ordersList = (params: RequestParams = {}) =>
    this.request<OrdersListData, any>({
      path: `/api/orders`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Orders
   * @name OrdersCreate
   * @summary Create new order
   * @request POST:/api/orders
   */
  ordersCreate = (data: CreateOrderRequest, params: RequestParams = {}) =>
    this.request<OrdersCreateData, any>({
      path: `/api/orders`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
}
