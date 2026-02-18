import { createBrowserRouter, Navigate } from "react-router-dom";

import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { ChannelDetailPage } from "./pages/ChannelDetailPage";
import { ChannelsPage } from "./pages/ChannelsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { PostDetailPage } from "./pages/PostDetailPage";
import { PostsPage } from "./pages/PostsPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SummariesPage } from "./pages/SummariesPage";
import { SummaryDetailPage } from "./pages/SummaryDetailPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/channels", element: <ChannelsPage /> },
      { path: "/channels/:id", element: <ChannelDetailPage /> },
      { path: "/posts", element: <PostsPage /> },
      { path: "/posts/:id", element: <PostDetailPage /> },
      { path: "/summaries", element: <SummariesPage /> },
      { path: "/summaries/:id", element: <SummaryDetailPage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
]);
