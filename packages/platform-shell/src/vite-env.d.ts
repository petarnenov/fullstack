/// <reference types="vite/client" />

declare module "*.module.css" {
  const content: Record<string, string>;
  export default content;
}

declare module "mfe_billing/BillingPage" {
  const BillingPage: React.ComponentType;
  export default BillingPage;
}

declare module "mfe_billing/OutstandingBalanceWidget" {
  const OutstandingBalanceWidget: React.ComponentType;
  export default OutstandingBalanceWidget;
}

declare module "mfe_open_account/OpenAccountPage" {
  const OpenAccountPage: React.ComponentType;
  export default OpenAccountPage;
}

declare module "mfe_open_account/OnboardingProgressWidget" {
  const OnboardingProgressWidget: React.ComponentType;
  export default OnboardingProgressWidget;
}
