import {
  ONBOARDING_STEPS,
  type Account,
  type CreateAccountRequest,
  type OnboardingProgress,
  type OnboardingStep,
} from "./accounts.schemas";

function iso(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(9, 0, 0, 0);
  return d.toISOString();
}

export class AccountNotFoundError extends Error {
  constructor(id: string) {
    super(`Account ${id} not found`);
  }
}

export class InvalidStepError extends Error {}

export interface IAccountsRepository {
  list(): Account[];
  get(id: string): Account | undefined;
  create(input: CreateAccountRequest): Account;
  advanceStep(id: string, step: OnboardingStep): Account;
  getProgress(): OnboardingProgress;
}

export class InMemoryAccountsRepository implements IAccountsRepository {
  private accounts: Account[] = [
    {
      id: "acc_verified_1",
      holderName: "Ada Lovelace",
      email: "ada@example.com",
      productType: "trading",
      status: "verified",
      completedSteps: [...ONBOARDING_STEPS],
      createdAt: iso(60),
      updatedAt: iso(45),
    },
    {
      id: "acc_verified_2",
      holderName: "Linus Torvalds",
      email: "linus@example.com",
      productType: "retirement",
      status: "verified",
      completedSteps: [...ONBOARDING_STEPS],
      createdAt: iso(30),
      updatedAt: iso(12),
    },
    {
      id: "acc_kyc_1",
      holderName: "Grace Hopper",
      email: "grace@example.com",
      productType: "savings",
      status: "kyc_pending",
      completedSteps: ["personal_info", "identity_verification"],
      createdAt: iso(6),
      updatedAt: iso(2),
    },
    {
      id: "acc_draft_1",
      holderName: "Alan Turing",
      email: "alan@example.com",
      productType: "trading",
      status: "draft",
      completedSteps: ["personal_info"],
      createdAt: iso(1),
      updatedAt: iso(1),
    },
  ];

  private seq = this.accounts.length + 1;

  list(): Account[] {
    return [...this.accounts].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  get(id: string): Account | undefined {
    return this.accounts.find((a) => a.id === id);
  }

  create(input: CreateAccountRequest): Account {
    const now = new Date().toISOString();
    const account: Account = {
      id: `acc_draft_${this.seq++}`,
      holderName: input.holderName,
      email: input.email,
      productType: input.productType,
      status: "draft",
      completedSteps: [],
      createdAt: now,
      updatedAt: now,
    };
    this.accounts.unshift(account);
    return account;
  }

  advanceStep(id: string, step: OnboardingStep): Account {
    const account = this.accounts.find((a) => a.id === id);
    if (!account) throw new AccountNotFoundError(id);

    const expectedIndex = account.completedSteps.length;
    const actualIndex = ONBOARDING_STEPS.indexOf(step);
    if (actualIndex !== expectedIndex) {
      throw new InvalidStepError(
        `Expected step ${ONBOARDING_STEPS[expectedIndex] ?? "none"}, got ${step}`,
      );
    }

    account.completedSteps = [...account.completedSteps, step];
    account.status = nextStatus(account.completedSteps.length);
    account.updatedAt = new Date().toISOString();
    return account;
  }

  getProgress(): OnboardingProgress {
    const totals = {
      totalAccounts: this.accounts.length,
      draft: 0,
      kycPending: 0,
      verified: 0,
      rejected: 0,
      averageCompletion: 0,
    };

    let completionSum = 0;
    for (const a of this.accounts) {
      if (a.status === "draft") totals.draft++;
      else if (a.status === "kyc_pending") totals.kycPending++;
      else if (a.status === "verified") totals.verified++;
      else if (a.status === "rejected") totals.rejected++;
      completionSum += a.completedSteps.length / ONBOARDING_STEPS.length;
    }

    totals.averageCompletion = this.accounts.length
      ? Math.round((completionSum / this.accounts.length) * 100)
      : 0;
    return totals;
  }
}

function nextStatus(completedCount: number): Account["status"] {
  if (completedCount === 0) return "draft";
  if (completedCount < ONBOARDING_STEPS.length - 1) return "draft";
  if (completedCount < ONBOARDING_STEPS.length) return "kyc_pending";
  return "verified";
}

export const accountsRepository: IAccountsRepository =
  new InMemoryAccountsRepository();
