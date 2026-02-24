import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";

import { router } from "./router";
import { useThemeStore } from "./stores/theme.store";

export default function App() {
  const isDark = useThemeStore((s) => s.isDark);

  useEffect(() => {
    document.documentElement.classList.toggle("light", !isDark);
  }, [isDark]);

  return <RouterProvider router={router} />;
}
