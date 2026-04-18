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

// Session tokens are delivered via httpOnly cookies. The JSON body only
// surfaces the user and the CSRF token the client must echo on state-changing
// requests (double-submit cookie pattern).
export const SessionResponseSchema = z.object({
  user: AuthenticatedUserSchema,
  csrfToken: z.string(),
});

export type UserRole = z.infer<typeof UserRoleEnum>;
export type AuthenticatedUser = z.infer<typeof AuthenticatedUserSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
