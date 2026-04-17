import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  InMemoryAuthRepository,
  InvalidCredentialsError,
} from "../domains/auth/auth.repository";

describe("Auth repository", () => {
  let repo: InMemoryAuthRepository;

  beforeEach(() => {
    repo = new InMemoryAuthRepository();
  });

  it("issues a session token on valid credentials", () => {
    const { token, user } = repo.login("admin@amp.demo", "admin123");
    expect(token).toHaveLength(48);
    expect(user.role).toBe("admin");
    expect(user).not.toHaveProperty("password");
  });

  it("rejects unknown email", () => {
    expect(() => repo.login("ghost@amp.demo", "whatever")).toThrow(
      InvalidCredentialsError,
    );
  });

  it("rejects wrong password", () => {
    expect(() => repo.login("admin@amp.demo", "wrong")).toThrow(
      InvalidCredentialsError,
    );
  });

  it("resolves users by token", () => {
    const { token } = repo.login("operator@amp.demo", "operator123");
    const user = repo.findUserByToken(token);
    expect(user?.email).toBe("operator@amp.demo");
  });

  it("returns undefined for unknown tokens", () => {
    expect(repo.findUserByToken("nope")).toBeUndefined();
  });

  it("logout invalidates the session", () => {
    const { token } = repo.login("analyst@amp.demo", "analyst123");
    repo.logout(token);
    expect(repo.findUserByToken(token)).toBeUndefined();
  });

  it("issues distinct tokens for each login", () => {
    const a = repo.login("admin@amp.demo", "admin123").token;
    const b = repo.login("admin@amp.demo", "admin123").token;
    expect(a).not.toBe(b);
  });

  it("email lookup is case-insensitive", () => {
    const { user } = repo.login("ADMIN@AMP.DEMO", "admin123");
    expect(user.id).toBe("usr_admin");
  });
});
