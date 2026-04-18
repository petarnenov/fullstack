import { randomBytes } from "crypto";
import argon2 from "argon2";
import type { AuthenticatedUser } from "./auth.schemas";

interface StoredUser extends AuthenticatedUser {
  passwordHash: string;
}

interface AccessSession {
  userId: string;
  expiresAt: number;
  csrfToken: string;
  familyId: string;
}

interface RefreshRecord {
  userId: string;
  expiresAt: number;
  revoked: boolean;
  familyId: string;
}

const ACCESS_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// A pre-computed argon2 hash used as a timing decoy when the email doesn't
// match a known user. Without it, login becomes a user-enumeration oracle
// because verify() takes ~50ms but missing-user short-circuits in <1ms.
const DUMMY_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$Zm9vYmFyZm9vYmFyZm8$" +
  "7EcVO4xyBhGpBL4cwGpwBnYpu8RlTmhVEcEJ3IHNJqk";

const DEMO_USERS: Array<Omit<StoredUser, "passwordHash"> & { password: string }> = [
  {
    id: "usr_admin",
    email: "admin@amp.demo",
    password: "admin123",
    fullName: "Ada Lovelace",
    role: "admin",
    tenantId: "amp-demo",
  },
  {
    id: "usr_operator",
    email: "operator@amp.demo",
    password: "operator123",
    fullName: "Ivana Petrova",
    role: "operator",
    tenantId: "amp-demo",
  },
  {
    id: "usr_analyst",
    email: "analyst@amp.demo",
    password: "analyst123",
    fullName: "Grace Hopper",
    role: "analyst",
    tenantId: "amp-demo",
  },
];

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid credentials");
  }
}

export class InvalidRefreshTokenError extends Error {
  constructor() {
    super("Invalid refresh token");
  }
}

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
  user: AuthenticatedUser;
}

export interface IAuthRepository {
  verifyCredentials(email: string, password: string): Promise<AuthenticatedUser>;
  issueSession(userId: string, familyId?: string): IssuedSession;
  rotateRefreshToken(refreshToken: string): IssuedSession;
  revokeRefreshToken(refreshToken: string): void;
  findUserByAccessToken(
    token: string,
  ): { user: AuthenticatedUser; csrfToken: string } | undefined;
  listDemoCredentials(): { email: string; password: string; role: string }[];
  ready(): Promise<void>;
}

export class InMemoryAuthRepository implements IAuthRepository {
  private readonly users = new Map<string, StoredUser>();
  private readonly accessSessions = new Map<string, AccessSession>();
  private readonly refreshTokens = new Map<string, RefreshRecord>();
  private readonly demoCredentials = DEMO_USERS.map((d) => ({
    email: d.email,
    password: d.password,
    role: d.role,
  }));
  private readonly seedPromise: Promise<void>;

  constructor() {
    this.seedPromise = this.seed();
  }

  private async seed() {
    for (const d of DEMO_USERS) {
      const passwordHash = await argon2.hash(d.password, { type: argon2.argon2id });
      this.users.set(d.id, {
        id: d.id,
        email: d.email,
        fullName: d.fullName,
        role: d.role,
        tenantId: d.tenantId,
        passwordHash,
      });
    }
  }

  ready(): Promise<void> {
    return this.seedPromise;
  }

  async verifyCredentials(
    email: string,
    password: string,
  ): Promise<AuthenticatedUser> {
    await this.seedPromise;
    const user = Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
    if (!user) {
      await argon2.verify(DUMMY_HASH, password).catch(() => undefined);
      throw new InvalidCredentialsError();
    }
    const ok = await argon2.verify(user.passwordHash, password).catch(() => false);
    if (!ok) throw new InvalidCredentialsError();
    return stripHash(user);
  }

  issueSession(userId: string, familyId?: string): IssuedSession {
    const user = this.users.get(userId);
    if (!user) throw new InvalidCredentialsError();
    const now = Date.now();
    const accessToken = randomBytes(24).toString("hex");
    const refreshToken = randomBytes(32).toString("hex");
    const csrfToken = randomBytes(16).toString("hex");
    const boundFamilyId = familyId ?? randomBytes(8).toString("hex");
    const accessExpiresAt = now + ACCESS_TTL_MS;
    const refreshExpiresAt = now + REFRESH_TTL_MS;
    this.accessSessions.set(accessToken, {
      userId,
      expiresAt: accessExpiresAt,
      csrfToken,
      familyId: boundFamilyId,
    });
    this.refreshTokens.set(refreshToken, {
      userId,
      expiresAt: refreshExpiresAt,
      revoked: false,
      familyId: boundFamilyId,
    });
    return {
      accessToken,
      refreshToken,
      csrfToken,
      accessExpiresAt,
      refreshExpiresAt,
      user: stripHash(user),
    };
  }

  rotateRefreshToken(refreshToken: string): IssuedSession {
    const record = this.refreshTokens.get(refreshToken);
    if (!record) throw new InvalidRefreshTokenError();
    if (record.revoked) {
      // Token reuse after rotation → assume compromise, kill the family.
      this.killFamily(record.familyId);
      throw new InvalidRefreshTokenError();
    }
    if (record.expiresAt < Date.now()) {
      this.refreshTokens.delete(refreshToken);
      throw new InvalidRefreshTokenError();
    }
    record.revoked = true;
    this.refreshTokens.set(refreshToken, record);
    return this.issueSession(record.userId, record.familyId);
  }

  revokeRefreshToken(refreshToken: string): void {
    const record = this.refreshTokens.get(refreshToken);
    if (!record) return;
    this.killFamily(record.familyId);
  }

  findUserByAccessToken(
    token: string,
  ): { user: AuthenticatedUser; csrfToken: string } | undefined {
    const session = this.accessSessions.get(token);
    if (!session) return undefined;
    if (session.expiresAt < Date.now()) {
      this.accessSessions.delete(token);
      return undefined;
    }
    const user = this.users.get(session.userId);
    if (!user) return undefined;
    return { user: stripHash(user), csrfToken: session.csrfToken };
  }

  listDemoCredentials() {
    return this.demoCredentials.slice();
  }

  private killFamily(familyId: string): void {
    for (const [tok, r] of this.refreshTokens.entries()) {
      if (r.familyId === familyId) this.refreshTokens.delete(tok);
    }
    for (const [tok, s] of this.accessSessions.entries()) {
      if (s.familyId === familyId) this.accessSessions.delete(tok);
    }
  }
}

function stripHash(user: StoredUser): AuthenticatedUser {
  const { passwordHash: _pw, ...rest } = user;
  return rest;
}

export const authRepository: IAuthRepository = new InMemoryAuthRepository();
