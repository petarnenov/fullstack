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

export enum OnboardingStep {
  PersonalInfo = "personal_info",
  IdentityVerification = "identity_verification",
  Funding = "funding",
  Review = "review",
}

export enum ProductType {
  Trading = "trading",
  Savings = "savings",
  Retirement = "retirement",
}

export enum AccountStatus {
  Draft = "draft",
  KycPending = "kyc_pending",
  Verified = "verified",
  Rejected = "rejected",
}

export enum TransactionType {
  Charge = "charge",
  Refund = "refund",
  Fee = "fee",
}

export enum InvoiceStatus {
  Pending = "pending",
  Paid = "paid",
  Overdue = "overdue",
}

export enum Currency {
  USD = "USD",
  EUR = "EUR",
  GBP = "GBP",
}

export interface Invoice {
  id: string;
  accountId: string;
  /** @format float */
  amount: number;
  currency: Currency;
  status: InvoiceStatus;
  description: string;
  /** @format date-time */
  issuedAt: string;
  /** @format date-time */
  dueAt: string;
  /** @format date-time */
  paidAt: string | null;
}

export interface Transaction {
  id: string;
  invoiceId: string;
  accountId: string;
  /** @format float */
  amount: number;
  currency: Currency;
  type: TransactionType;
  description: string;
  /** @format date-time */
  timestamp: string;
}

export interface BillingSummary {
  outstandingBalance: number;
  currency: Currency;
  overdueCount: number;
  pendingCount: number;
  paidThisMonth: number;
}

export interface PayInvoiceRequest {
  paymentMethodId: string;
}

export interface Account {
  id: string;
  holderName: string;
  /** @format email */
  email: string;
  productType: ProductType;
  status: AccountStatus;
  completedSteps: OnboardingStep[];
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface OnboardingProgress {
  totalAccounts: number;
  draft: number;
  kycPending: number;
  verified: number;
  rejected: number;
  averageCompletion: number;
}

export interface CreateAccountRequest {
  holderName: string;
  /** @format email */
  email: string;
  productType: ProductType;
}

export interface AdvanceStepRequest {
  step: OnboardingStep;
}

export type BillingInvoicesListData = Invoice[];

export interface BillingInvoicesDetailParams {
  id: string;
}

export type BillingInvoicesDetailData = Invoice;

export interface BillingInvoicesPayCreateParams {
  id: string;
}

export type BillingInvoicesPayCreateData = Invoice;

export type BillingTransactionsListData = Transaction[];

export type BillingSummaryListData = BillingSummary;

export type AccountsListData = Account[];

export type AccountsCreateData = Account;

export type AccountsProgressListData = OnboardingProgress;

export interface AccountsDetailParams {
  id: string;
}

export type AccountsDetailData = Account;

export interface AccountsAdvanceCreateParams {
  id: string;
}

export type AccountsAdvanceCreateData = Account;
