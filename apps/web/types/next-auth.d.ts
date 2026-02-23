import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    login?: string | null;
  }

  interface Session {
    user: {
      id: string;
      login: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    login?: string | null;
  }
}
