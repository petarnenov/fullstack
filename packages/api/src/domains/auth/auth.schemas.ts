import { z } from "zod";

export const UserRoleEnum = z.enum(["admin", "operator", "analyst"]);

export const AuthenticatedUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  role: UserRoleEnum,
  tenantId: z.string(),
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const LoginResponseSchema = z.object({
  token: z.string(),
  user: AuthenticatedUserSchema,
});

export type UserRole = z.infer<typeof UserRoleEnum>;
export type AuthenticatedUser = z.infer<typeof AuthenticatedUserSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
