import { randomBytes } from "crypto";
import type { AuthenticatedUser } from "./auth.schemas";

interface StoredUser extends AuthenticatedUser {
  password: string;
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid credentials");
  }
}

export interface IAuthRepository {
  login(email: string, password: string): { token: string; user: AuthenticatedUser };
  logout(token: string): void;
  findUserByToken(token: string): AuthenticatedUser | undefined;
  listDemoCredentials(): { email: string; password: string; role: string }[];
}

export class InMemoryAuthRepository implements IAuthRepository {
  private readonly users: StoredUser[] = [
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

  private readonly sessions = new Map<string, string>();

  login(email: string, password: string) {
    const user = this.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
    );
    if (!user) throw new InvalidCredentialsError();

    const token = randomBytes(24).toString("hex");
    this.sessions.set(token, user.id);
    return { token, user: stripPassword(user) };
  }

  logout(token: string): void {
    this.sessions.delete(token);
  }

  findUserByToken(token: string): AuthenticatedUser | undefined {
    const userId = this.sessions.get(token);
    if (!userId) return undefined;
    const user = this.users.find((u) => u.id === userId);
    return user ? stripPassword(user) : undefined;
  }

  listDemoCredentials() {
    return this.users.map((u) => ({
      email: u.email,
      password: u.password,
      role: u.role,
    }));
  }
}

function stripPassword(user: StoredUser): AuthenticatedUser {
  const { password: _pw, ...rest } = user;
  return rest;
}

export const authRepository: IAuthRepository = new InMemoryAuthRepository();
