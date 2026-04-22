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

export interface AccountReport {
  accountId?: string;
  holderName?: string;
  productType?: string;
  status?: string;
  /** @format double */
  outstandingAmount?: number;
  /** @format int32 */
  outstandingInvoiceCount?: number;
  /** @format int32 */
  overdueInvoiceCount?: number;
  /** @format double */
  cashAvailable?: number;
  /** @format double */
  totalEquity?: number;
  /** @format double */
  totalUnrealizedPnL?: number;
  /** @format int32 */
  positionsCount?: number;
  topHoldingTicker?: string;
}

export type SummaryData = AccountReport[];

export type HealthData = Record<string, object>;
