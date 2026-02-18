import { Link } from "react-router-dom";

import { LoginForm } from "../components/auth/LoginForm";

export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-sm border w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Вход</h1>
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
