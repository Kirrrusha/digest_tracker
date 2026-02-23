"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";

const registerSchema = z.object({
  name: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  login: z.string().min(3, "Логин должен содержать минимум 3 символа"),
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
});

const loginSchema = z.object({
  login: z.string().min(3, "Введите логин"),
  password: z.string().min(1, "Введите пароль"),
});

export type AuthState = {
  error?: string;
  success?: boolean;
};

export async function register(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const rawData = {
    name: formData.get("name"),
    login: formData.get("login"),
    password: formData.get("password"),
  };

  const parsed = registerSchema.safeParse(rawData);

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { name, login, password } = parsed.data;

  const existingUser = await db.user.findUnique({
    where: { login },
  });

  if (existingUser) {
    return { error: "Пользователь с таким логином уже существует" };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.user.create({
    data: {
      name,
      login,
      passwordHash,
    },
  });

  return { success: true };
}

export async function login(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const rawData = {
    login: formData.get("login"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(rawData);

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  try {
    await signIn("credentials", {
      login: parsed.data.login,
      password: parsed.data.password,
      redirectTo: "/",
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Неверный логин или пароль" };
        default:
          return { error: "Произошла ошибка при входе" };
      }
    }
    throw error;
  }
}
