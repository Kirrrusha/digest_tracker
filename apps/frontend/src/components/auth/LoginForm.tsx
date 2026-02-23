import { loginSchema, type LoginDto } from "@devdigest/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { authApi } from "../../api/auth";
import { useAuthStore } from "../../stores/auth.store";

export function LoginForm() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginDto>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginDto) => {
    try {
      const tokens = await authApi.login(data);
      setTokens(tokens.accessToken, tokens.refreshToken);
      navigate("/dashboard");
    } catch {
      toast.error("Неверный логин или пароль");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Логин</label>
        <input
          type="text"
          {...register("login")}
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.login && <p className="text-red-500 text-xs mt-1">{errors.login.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
        <input
          type="password"
          {...register("password")}
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? "Входим..." : "Войти"}
      </button>
    </form>
  );
}
