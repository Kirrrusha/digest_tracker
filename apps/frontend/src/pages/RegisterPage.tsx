import { Link } from "react-router-dom";

import { PasskeySignupButton } from "../components/auth/PasskeySignupButton";
import { RegisterForm } from "../components/auth/RegisterForm";

export function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-sm border w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Регистрация</h1>

        <PasskeySignupButton />

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">или с паролем</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <RegisterForm />

        <p className="text-sm text-gray-500 mt-4 text-center">
          Уже есть аккаунт?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
