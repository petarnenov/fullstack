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

import { HealthData, SummaryData } from "./data-contracts";
import { HttpClient, RequestParams } from "./http-client";

export class Api<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @tags reports-controller
   * @name Summary
   * @request GET:/api/reporting/summary
   */
  summary = (params: RequestParams = {}) =>
    this.request<SummaryData, any>({
      path: `/api/reporting/summary`,
      method: "GET",
      ...params,
    });
  /**
   * No description
   *
   * @tags health-controller
   * @name Health
   * @request GET:/api/reporting/health
   */
  health = (params: RequestParams = {}) =>
    this.request<HealthData, any>({
      path: `/api/reporting/health`,
      method: "GET",
      ...params,
    });
}
