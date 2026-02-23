export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginDto {
  login: string;
  password: string;
}

export interface RegisterDto {
  login: string;
  password: string;
  name?: string;
}

export interface UserProfile {
  id: string;
  login: string | null;
  name: string | null;
  hasTelegram: boolean;
  hasPasskey: boolean;
}
