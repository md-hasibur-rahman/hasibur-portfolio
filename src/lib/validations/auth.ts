import { z } from "zod";

// Client validation is a convenience; every one of these schemas is re-applied server-side.
const password = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(256, "Too long")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/i, "Letters, numbers and underscores only"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password").max(256),
});

// The login form may carry a post-login destination. Same-site only, so a crafted
// ?callbackUrl=//evil.example cannot turn the app into an open redirect.
export const loginFormSchema = loginSchema.extend({
  redirectTo: z
    .string()
    .regex(/^\/(?!\/)[\w\-./?=&%#]*$/)
    .optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(200),
  password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: password,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
