import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  challengeStore,
  clearChallenge,
  getChallenge,
  origin,
  rpID,
  rpName,
  setChallenge,
} from "../passkey/config";

describe("passkey/config", () => {
  describe("константы конфигурации", () => {
    it("rpName имеет корректное значение", () => {
      expect(rpName).toBe("DevDigest");
    });

    it("rpID равен localhost в development", () => {
      expect(rpID).toBe("localhost");
    });

    it("origin равен http://localhost:3000 в development", () => {
      expect(origin).toBe("http://localhost:3000");
    });
  });

  describe("управление challenges", () => {
    beforeEach(() => {
      challengeStore.clear();
    });

    afterEach(() => {
      challengeStore.clear();
      vi.useRealTimers();
    });

    describe("setChallenge", () => {
      it("сохраняет challenge в store", () => {
        setChallenge("user-123", "challenge-abc");

        const entry = challengeStore.get("user-123");
        expect(entry).toBeDefined();
        expect(entry?.challenge).toBe("challenge-abc");
      });

      it("устанавливает время истечения 5 минут", () => {
        vi.useFakeTimers();
        const now = Date.now();
        vi.setSystemTime(now);

        setChallenge("user-123", "challenge-abc");

        const entry = challengeStore.get("user-123");
        const expectedExpires = now + 5 * 60 * 1000;
        expect(entry?.expires).toBe(expectedExpires);
      });

      it("перезаписывает существующий challenge", () => {
        setChallenge("user-123", "challenge-1");
        setChallenge("user-123", "challenge-2");

        const entry = challengeStore.get("user-123");
        expect(entry?.challenge).toBe("challenge-2");
      });
    });

    describe("getChallenge", () => {
      it("возвращает сохранённый challenge", () => {
        setChallenge("user-123", "challenge-abc");

        const result = getChallenge("user-123");
        expect(result).toBe("challenge-abc");
      });

      it("возвращает null для несуществующего ключа", () => {
        const result = getChallenge("nonexistent");
        expect(result).toBeNull();
      });

      it("возвращает null и удаляет истёкший challenge", () => {
        vi.useFakeTimers();
        const now = Date.now();
        vi.setSystemTime(now);

        setChallenge("user-123", "challenge-abc");

        // Перемотаем время на 6 минут вперёд
        vi.setSystemTime(now + 6 * 60 * 1000);

        const result = getChallenge("user-123");
        expect(result).toBeNull();
        expect(challengeStore.has("user-123")).toBe(false);
      });

      it("возвращает challenge если он ещё не истёк", () => {
        vi.useFakeTimers();
        const now = Date.now();
        vi.setSystemTime(now);

        setChallenge("user-123", "challenge-abc");

        // Перемотаем время на 4 минуты вперёд (меньше 5 минут)
        vi.setSystemTime(now + 4 * 60 * 1000);

        const result = getChallenge("user-123");
        expect(result).toBe("challenge-abc");
      });
    });

    describe("clearChallenge", () => {
      it("удаляет challenge из store", () => {
        setChallenge("user-123", "challenge-abc");
        expect(challengeStore.has("user-123")).toBe(true);

        clearChallenge("user-123");
        expect(challengeStore.has("user-123")).toBe(false);
      });

      it("не выбрасывает ошибку для несуществующего ключа", () => {
        expect(() => clearChallenge("nonexistent")).not.toThrow();
      });
    });
  });
});
