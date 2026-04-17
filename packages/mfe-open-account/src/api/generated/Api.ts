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
  AccountsAdvanceCreateData,
  AccountsAdvanceCreateParams,
  AccountsCreateData,
  AccountsDetailData,
  AccountsDetailParams,
  AccountsListData,
  AccountsProgressListData,
  AdvanceStepRequest,
  AuthDemoCredentialsListData,
  AuthLoginCreateData,
  AuthLogoutCreateData,
  AuthMeListData,
  BillingInvoicesDetailData,
  BillingInvoicesDetailParams,
  BillingInvoicesListData,
  BillingInvoicesPayCreateData,
  BillingInvoicesPayCreateParams,
  BillingSummaryListData,
  BillingTransactionsListData,
  CreateAccountRequest,
  LoginRequest,
  PayInvoiceRequest,
  PlaceOrderRequest,
  TradingOrdersCreateData,
  TradingOrdersCreateError,
  TradingOrdersListData,
  TradingPortfolioListData,
  TradingPositionsListData,
  TradingSymbolsListData,
} from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Api<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @tags Auth
   * @name AuthLoginCreate
   * @summary Exchange credentials for a session token
   * @request POST:/api/auth/login
   */
  authLoginCreate = (data: LoginRequest, params: RequestParams = {}) =>
    this.request<AuthLoginCreateData, void>({
      path: `/api/auth/login`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Auth
   * @name AuthLogoutCreate
   * @summary Revoke the current session
   * @request POST:/api/auth/logout
   * @secure
   */
  authLogoutCreate = (params: RequestParams = {}) =>
    this.request<AuthLogoutCreateData, any>({
      path: `/api/auth/logout`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Auth
   * @name AuthMeList
   * @summary Get the current user (token validation)
   * @request GET:/api/auth/me
   * @secure
   */
  authMeList = (params: RequestParams = {}) =>
    this.request<AuthMeListData, void>({
      path: `/api/auth/me`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Auth
   * @name AuthDemoCredentialsList
   * @summary Demo-only: list hardcoded credentials for the login page
   * @request GET:/api/auth/demo-credentials
   */
  authDemoCredentialsList = (params: RequestParams = {}) =>
    this.request<AuthDemoCredentialsListData, any>({
      path: `/api/auth/demo-credentials`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Billing
   * @name BillingInvoicesList
   * @summary List invoices
   * @request GET:/api/billing/invoices
   * @secure
   */
  billingInvoicesList = (params: RequestParams = {}) =>
    this.request<BillingInvoicesListData, any>({
      path: `/api/billing/invoices`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Billing
   * @name BillingInvoicesDetail
   * @summary Get invoice
   * @request GET:/api/billing/invoices/{id}
   * @secure
   */
  billingInvoicesDetail = (
    { id, ...query }: BillingInvoicesDetailParams,
    params: RequestParams = {},
  ) =>
    this.request<BillingInvoicesDetailData, void>({
      path: `/api/billing/invoices/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Billing
   * @name BillingInvoicesPayCreate
   * @summary Pay invoice
   * @request POST:/api/billing/invoices/{id}/pay
   * @secure
   */
  billingInvoicesPayCreate = (
    { id, ...query }: BillingInvoicesPayCreateParams,
    data: PayInvoiceRequest,
    params: RequestParams = {},
  ) =>
    this.request<BillingInvoicesPayCreateData, void>({
      path: `/api/billing/invoices/${id}/pay`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Billing
   * @name BillingTransactionsList
   * @summary List transactions
   * @request GET:/api/billing/transactions
   * @secure
   */
  billingTransactionsList = (params: RequestParams = {}) =>
    this.request<BillingTransactionsListData, any>({
      path: `/api/billing/transactions`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Billing
   * @name BillingSummaryList
   * @summary Billing summary (used by OutstandingBalanceWidget)
   * @request GET:/api/billing/summary
   * @secure
   */
  billingSummaryList = (params: RequestParams = {}) =>
    this.request<BillingSummaryListData, any>({
      path: `/api/billing/summary`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Accounts
   * @name AccountsList
   * @summary List accounts
   * @request GET:/api/accounts
   * @secure
   */
  accountsList = (params: RequestParams = {}) =>
    this.request<AccountsListData, any>({
      path: `/api/accounts`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Accounts
   * @name AccountsCreate
   * @summary Start new account onboarding
   * @request POST:/api/accounts
   * @secure
   */
  accountsCreate = (data: CreateAccountRequest, params: RequestParams = {}) =>
    this.request<AccountsCreateData, void>({
      path: `/api/accounts`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Accounts
   * @name AccountsProgressList
   * @summary Onboarding progress (used by OnboardingProgressWidget)
   * @request GET:/api/accounts/progress
   * @secure
   */
  accountsProgressList = (params: RequestParams = {}) =>
    this.request<AccountsProgressListData, any>({
      path: `/api/accounts/progress`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Accounts
   * @name AccountsDetail
   * @summary Get account
   * @request GET:/api/accounts/{id}
   * @secure
   */
  accountsDetail = (
    { id, ...query }: AccountsDetailParams,
    params: RequestParams = {},
  ) =>
    this.request<AccountsDetailData, void>({
      path: `/api/accounts/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Accounts
   * @name AccountsAdvanceCreate
   * @summary Advance onboarding to next step
   * @request POST:/api/accounts/{id}/advance
   * @secure
   */
  accountsAdvanceCreate = (
    { id, ...query }: AccountsAdvanceCreateParams,
    data: AdvanceStepRequest,
    params: RequestParams = {},
  ) =>
    this.request<AccountsAdvanceCreateData, void>({
      path: `/api/accounts/${id}/advance`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Trading
   * @name TradingSymbolsList
   * @summary List tradable instruments with last price
   * @request GET:/api/trading/symbols
   * @secure
   */
  tradingSymbolsList = (params: RequestParams = {}) =>
    this.request<TradingSymbolsListData, any>({
      path: `/api/trading/symbols`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Trading
   * @name TradingPositionsList
   * @summary Current portfolio positions
   * @request GET:/api/trading/positions
   * @secure
   */
  tradingPositionsList = (params: RequestParams = {}) =>
    this.request<TradingPositionsListData, any>({
      path: `/api/trading/positions`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Trading
   * @name TradingOrdersList
   * @summary Order history (most recent first)
   * @request GET:/api/trading/orders
   * @secure
   */
  tradingOrdersList = (params: RequestParams = {}) =>
    this.request<TradingOrdersListData, any>({
      path: `/api/trading/orders`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Trading
   * @name TradingOrdersCreate
   * @summary Place a market order (instant fill in POC)
   * @request POST:/api/trading/orders
   * @secure
   */
  tradingOrdersCreate = (data: PlaceOrderRequest, params: RequestParams = {}) =>
    this.request<TradingOrdersCreateData, TradingOrdersCreateError>({
      path: `/api/trading/orders`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Trading
   * @name TradingPortfolioList
   * @summary Portfolio summary (used by PortfolioWidget)
   * @request GET:/api/trading/portfolio
   * @secure
   */
  tradingPortfolioList = (params: RequestParams = {}) =>
    this.request<TradingPortfolioListData, any>({
      path: `/api/trading/portfolio`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
}
