import { type Metadata } from "next";

import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Регистрация | DevDigest",
  description: "Создайте аккаунт DevDigest",
};

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Регистрация</h1>
        <p className="text-muted-foreground">Создайте аккаунт для доступа к DevDigest</p>
      </div>
      <RegisterForm />
    </div>
  );
}
