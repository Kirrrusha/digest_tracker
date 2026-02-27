import type { AuthTokens } from "@devdigest/shared";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";

import { api } from "./client";

export const passkeyApi = {
  getRegistrationOptions: () =>
    api
      .post<PublicKeyCredentialCreationOptionsJSON>("/passkey/register/options")
      .then((r) => r.data),

  verifyRegistration: (response: RegistrationResponseJSON, name?: string) =>
    api
      .post<{ verified: boolean }>("/passkey/register/verify", { response, name })
      .then((r) => r.data),

  getAuthOptions: () =>
    api
      .post<{
        options: PublicKeyCredentialRequestOptionsJSON;
        challengeId: string;
      }>("/passkey/login/options")
      .then((r) => r.data),

  verifyAuthentication: (challengeId: string, response: AuthenticationResponseJSON) =>
    api.post<AuthTokens>("/passkey/login/verify", { challengeId, response }).then((r) => r.data),

  getSignupOptions: (name?: string) =>
    api
      .post<{
        options: PublicKeyCredentialCreationOptionsJSON;
        challengeId: string;
      }>("/passkey/signup/options", { name })
      .then((r) => r.data),

  verifySignup: (challengeId: string, response: RegistrationResponseJSON) =>
    api.post<AuthTokens>("/passkey/signup/verify", { challengeId, response }).then((r) => r.data),

  list: () =>
    api
      .get<
        Array<{ id: string; name: string | null; createdAt: string; credentialDeviceType: string }>
      >("/passkey")
      .then((r) => r.data),

  deleteKey: (id: string) => api.delete(`/passkey/${id}`),
};
