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

export enum OrderStatus {
  Filled = "filled",
  Rejected = "rejected",
}

export enum OrderSide {
  Buy = "buy",
  Sell = "sell",
}

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

export enum UserRole {
  Admin = "admin",
  Operator = "operator",
  Analyst = "analyst",
}

export interface AuthenticatedUser {
  id: string;
  /** @format email */
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string;
}

export interface LoginRequest {
  /** @format email */
  email: string;
  password: string;
}

export interface LoginResponse {
  csrfToken: string;
  user: AuthenticatedUser;
}

export interface DemoCredential {
  /** @format email */
  email: string;
  password: string;
  role: string;
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

export interface TradingSymbol {
  ticker: string;
  name: string;
  sector: string;
  /** @format float */
  lastPrice: number;
  /** @format float */
  change24h: number;
}

export interface Position {
  accountId: string;
  ticker: string;
  name: string;
  quantity: number;
  averageCost: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

export interface Order {
  id: string;
  accountId: string;
  ticker: string;
  side: OrderSide;
  quantity: number;
  fillPrice: number;
  total: number;
  status: OrderStatus;
  rejectionReason: string | null;
  /** @format date-time */
  placedAt: string;
}

export interface PlaceOrderRequest {
  accountId: string;
  ticker: string;
  side: OrderSide;
  quantity: number;
}

export interface PortfolioSummary {
  accountId: string | null;
  cashAvailable: number;
  totalMarketValue: number;
  totalCostBasis: number;
  totalUnrealizedPnL: number;
  totalUnrealizedPnLPercent: number;
  totalEquity: number;
  positionsCount: number;
  topHoldingTicker: string | null;
}

export interface CashBalance {
  accountId: string;
  cashAvailable: number;
  currency: "USD";
}

export interface TradingAccountView {
  accountId: string;
  cashAvailable: number;
  currency: "USD";
}

export interface DepositRequest {
  accountId: string;
  /** @min 0.01 */
  amount: number;
}

export type AuthLoginCreateData = LoginResponse;

export type AuthRefreshCreateData = LoginResponse;

export type AuthLogoutCreateData = any;

export type AuthMeListData = AuthenticatedUser;

export type AuthDemoCredentialsListData = DemoCredential[];

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

export type TradingSymbolsListData = TradingSymbol[];

export type TradingAccountsListData = TradingAccountView[];

export interface TradingCashDetailParams {
  accountId: string;
}

export type TradingCashDetailData = CashBalance;

export type TradingCashDepositCreateData = CashBalance;

export interface TradingPositionsListParams {
  accountId?: string;
}

export type TradingPositionsListData = Position[];

export interface TradingOrdersListParams {
  accountId?: string;
}

export type TradingOrdersListData = Order[];

export type TradingOrdersCreateData = Order;

export type TradingOrdersCreateError = Order;

export interface TradingPortfolioListParams {
  accountId: string;
}

export type TradingPortfolioListData = PortfolioSummary;
