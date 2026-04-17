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
  BillingInvoicesDetailData,
  BillingInvoicesDetailParams,
  BillingInvoicesListData,
  BillingInvoicesPayCreateData,
  BillingInvoicesPayCreateParams,
  BillingSummaryListData,
  BillingTransactionsListData,
  CreateAccountRequest,
  PayInvoiceRequest,
} from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Api<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @tags Billing
   * @name BillingInvoicesList
   * @summary List invoices
   * @request GET:/api/billing/invoices
   */
  billingInvoicesList = (params: RequestParams = {}) =>
    this.request<BillingInvoicesListData, any>({
      path: `/api/billing/invoices`,
      method: "GET",
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
   */
  billingInvoicesDetail = (
    { id, ...query }: BillingInvoicesDetailParams,
    params: RequestParams = {},
  ) =>
    this.request<BillingInvoicesDetailData, void>({
      path: `/api/billing/invoices/${id}`,
      method: "GET",
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
   */
  billingTransactionsList = (params: RequestParams = {}) =>
    this.request<BillingTransactionsListData, any>({
      path: `/api/billing/transactions`,
      method: "GET",
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
   */
  billingSummaryList = (params: RequestParams = {}) =>
    this.request<BillingSummaryListData, any>({
      path: `/api/billing/summary`,
      method: "GET",
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
   */
  accountsList = (params: RequestParams = {}) =>
    this.request<AccountsListData, any>({
      path: `/api/accounts`,
      method: "GET",
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
   */
  accountsCreate = (data: CreateAccountRequest, params: RequestParams = {}) =>
    this.request<AccountsCreateData, void>({
      path: `/api/accounts`,
      method: "POST",
      body: data,
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
   */
  accountsProgressList = (params: RequestParams = {}) =>
    this.request<AccountsProgressListData, any>({
      path: `/api/accounts/progress`,
      method: "GET",
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
   */
  accountsDetail = (
    { id, ...query }: AccountsDetailParams,
    params: RequestParams = {},
  ) =>
    this.request<AccountsDetailData, void>({
      path: `/api/accounts/${id}`,
      method: "GET",
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
      type: ContentType.Json,
      format: "json",
      ...params,
    });
}
