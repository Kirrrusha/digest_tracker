import { type Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Вход | DevDigest",
  description: "Войдите в свой аккаунт DevDigest",
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Вход</h1>
        <p className="text-muted-foreground">Введите email и пароль для входа в аккаунт</p>
      </div>
      <LoginForm />
    </div>
  );
}
