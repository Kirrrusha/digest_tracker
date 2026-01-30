/**
 * Модуль конфигурации WebAuthn/Passkey.
 * Предоставляет настройки Relying Party и управление challenge для WebAuthn аутентификации.
 * @module lib/passkey/config
 */

/** Название Relying Party, отображаемое пользователям при регистрации passkey */
export const rpName = "DevDigest";

/**
 * ID Relying Party — идентификатор домена для WebAuthn credentials.
 * В разработке используется localhost, в продакшене — настраиваемый домен.
 */
export const rpID =
  process.env.NODE_ENV === "production"
    ? process.env.WEBAUTHN_RP_ID || "devdigest.app"
    : "localhost";

/**
 * Ожидаемый origin для WebAuthn операций.
 * Должен совпадать с origin, с которого выполняются запросы аутентификации.
 */
export const origin =
  process.env.NODE_ENV === "production"
    ? process.env.WEBAUTHN_ORIGIN || `https://${rpID}`
    : "http://localhost:3000";

/** Время жизни challenge в миллисекундах (5 минут) */
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/**
 * Хранилище WebAuthn challenges в памяти.
 * Связывает ID пользователя/сессии с данными challenge и временем истечения.
 * @internal В продакшене используйте Redis для multi-instance развёртывания
 */
export const challengeStore = new Map<string, { challenge: string; expires: number }>();

/**
 * Сохраняет WebAuthn challenge для последующей верификации.
 * Challenge истекает через 5 минут для безопасности.
 *
 * @param key - Уникальный идентификатор (ID пользователя или ключ сессии)
 * @param challenge - Строка challenge для сохранения
 *
 * @example
 * setChallenge(userId, options.challenge);
 */
export function setChallenge(key: string, challenge: string): void {
  challengeStore.set(key, {
    challenge,
    expires: Date.now() + CHALLENGE_TTL_MS,
  });
}

/**
 * Получает сохранённый WebAuthn challenge, если он не истёк.
 * Автоматически удаляет истёкшие challenges.
 *
 * @param key - Уникальный идентификатор, использованный при сохранении
 * @returns Строка challenge если валидна, null если не найдена или истекла
 *
 * @example
 * const challenge = getChallenge(userId);
 * if (!challenge) throw new Error("Challenge истёк");
 */
export function getChallenge(key: string): string | null {
  const entry = challengeStore.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expires) {
    challengeStore.delete(key);
    return null;
  }

  return entry.challenge;
}

/**
 * Удаляет challenge из хранилища после успешной верификации.
 * Должна вызываться после верификации WebAuthn для предотвращения replay-атак.
 *
 * @param key - Уникальный идентификатор, использованный при сохранении
 *
 * @example
 * await verifyRegistration(credential, challenge);
 * clearChallenge(userId);
 */
export function clearChallenge(key: string): void {
  challengeStore.delete(key);
}
