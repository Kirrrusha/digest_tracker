import { z } from "zod";

export const loginSchema = z.object({
  login: z.string().min(3, "Минимум 3 символа"),
  password: z.string().min(8, "Минимум 8 символов"),
});

export const registerSchema = z.object({
  login: z.string().min(3, "Минимум 3 символа"),
  password: z.string().min(8, "Минимум 8 символов"),
  name: z.string().min(2, "Минимум 2 символа").optional(),
});
