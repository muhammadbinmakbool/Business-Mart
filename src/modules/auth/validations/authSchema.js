import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const createUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
});

export const updateUserSchema = z.object({
  email: z.string().email("Valid email is required").optional(),
  name: z.string().min(1, "Name is required").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional().nullable(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  isActive: z.boolean().optional(),
});
