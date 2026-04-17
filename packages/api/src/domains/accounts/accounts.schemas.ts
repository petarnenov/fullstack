import { z } from "zod";

export const AccountStatusEnum = z.enum([
  "draft",
  "kyc_pending",
  "verified",
  "rejected",
]);
export const ProductTypeEnum = z.enum(["trading", "savings", "retirement"]);

export const ONBOARDING_STEPS = [
  "personal_info",
  "identity_verification",
  "funding",
  "review",
] as const;

export const OnboardingStepEnum = z.enum(ONBOARDING_STEPS);

export const AccountSchema = z.object({
  id: z.string(),
  holderName: z.string(),
  email: z.string().email(),
  productType: ProductTypeEnum,
  status: AccountStatusEnum,
  completedSteps: z.array(OnboardingStepEnum),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const OnboardingProgressSchema = z.object({
  totalAccounts: z.number(),
  draft: z.number(),
  kycPending: z.number(),
  verified: z.number(),
  rejected: z.number(),
  averageCompletion: z.number(),
});

export const CreateAccountRequestSchema = z.object({
  holderName: z.string().min(2),
  email: z.string().email(),
  productType: ProductTypeEnum,
});

export const AdvanceStepRequestSchema = z.object({
  step: OnboardingStepEnum,
});

export type Account = z.infer<typeof AccountSchema>;
export type AccountStatus = z.infer<typeof AccountStatusEnum>;
export type ProductType = z.infer<typeof ProductTypeEnum>;
export type OnboardingStep = z.infer<typeof OnboardingStepEnum>;
export type OnboardingProgress = z.infer<typeof OnboardingProgressSchema>;
export type CreateAccountRequest = z.infer<typeof CreateAccountRequestSchema>;
export type AdvanceStepRequest = z.infer<typeof AdvanceStepRequestSchema>;
