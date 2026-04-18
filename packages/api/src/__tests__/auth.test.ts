import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  InMemoryAuthRepository,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
} from "../domains/auth/auth.repository";

describe("Auth repository", () => {
  let repo: InMemoryAuthRepository;

  beforeEach(async () => {
    repo = new InMemoryAuthRepository();
    await repo.ready();
  });

  it("issues access, refresh, and csrf tokens on valid credentials", async () => {
    const user = await repo.verifyCredentials("admin@amp.demo", "admin123");
    const session = repo.issueSession(user.id);
    expect(session.accessToken).toHaveLength(48);
    expect(session.refreshToken).toHaveLength(64);
    expect(session.csrfToken).toHaveLength(32);
    expect(session.user.role).toBe("admin");
    expect(session.user).not.toHaveProperty("password");
    expect(session.user).not.toHaveProperty("passwordHash");
  });

  it("rejects unknown email with same error as wrong password", async () => {
    await expect(repo.verifyCredentials("ghost@amp.demo", "whatever")).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    await expect(repo.verifyCredentials("admin@amp.demo", "wrong")).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it("resolves users by access token and exposes the bound csrf", async () => {
    const user = await repo.verifyCredentials("operator@amp.demo", "operator123");
    const session = repo.issueSession(user.id);
    const resolved = repo.findUserByAccessToken(session.accessToken);
    expect(resolved?.user.email).toBe("operator@amp.demo");
    expect(resolved?.csrfToken).toBe(session.csrfToken);
  });

  it("returns undefined for unknown access tokens", () => {
    expect(repo.findUserByAccessToken("nope")).toBeUndefined();
  });

  it("revokeRefreshToken kills the whole family (access + refresh)", async () => {
    const user = await repo.verifyCredentials("analyst@amp.demo", "analyst123");
    const session = repo.issueSession(user.id);
    repo.revokeRefreshToken(session.refreshToken);
    expect(repo.findUserByAccessToken(session.accessToken)).toBeUndefined();
    expect(() => repo.rotateRefreshToken(session.refreshToken)).toThrow(
      InvalidRefreshTokenError,
    );
  });

  it("rotates refresh tokens and invalidates the previous one", async () => {
    const user = await repo.verifyCredentials("admin@amp.demo", "admin123");
    const first = repo.issueSession(user.id);
    const second = repo.rotateRefreshToken(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(second.accessToken).not.toBe(first.accessToken);
    // Re-using the rotated token is treated as theft and kills the family.
    expect(() => repo.rotateRefreshToken(first.refreshToken)).toThrow(
      InvalidRefreshTokenError,
    );
    expect(() => repo.rotateRefreshToken(second.refreshToken)).toThrow(
      InvalidRefreshTokenError,
    );
  });

  it("issues distinct tokens for each login", async () => {
    const user = await repo.verifyCredentials("admin@amp.demo", "admin123");
    const a = repo.issueSession(user.id).accessToken;
    const b = repo.issueSession(user.id).accessToken;
    expect(a).not.toBe(b);
  });

  it("email lookup is case-insensitive", async () => {
    const user = await repo.verifyCredentials("ADMIN@AMP.DEMO", "admin123");
    expect(user.id).toBe("usr_admin");
  });
});
