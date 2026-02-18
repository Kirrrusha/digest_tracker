export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name?: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  hasTelegram: boolean;
  hasPasskey: boolean;
}
