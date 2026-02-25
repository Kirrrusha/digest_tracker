import { Link } from "react-router-dom";

import { LoginForm } from "../components/auth/LoginForm";
import { PasskeyLoginButton } from "../components/auth/PasskeyLoginButton";

export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-sm border w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Вход</h1>

        <PasskeyLoginButton />

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">или</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <LoginForm />

        <p className="text-sm text-gray-500 mt-4 text-center">
          Нет аккаунта?{" "}
          <Link to="/register" className="text-blue-600 hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
