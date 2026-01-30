import { describe, expect, it } from "vitest";

import { cn } from "../utils";

describe("cn", () => {
  it("объединяет строки классов", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("обрабатывает условные классы", () => {
    expect(cn("base", true && "active")).toBe("base active");
    expect(cn("base", false && "active")).toBe("base");
  });

  it("обрабатывает объекты с условиями", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active");
  });

  it("обрабатывает массивы классов", () => {
    expect(cn(["foo", "bar"], "baz")).toBe("foo bar baz");
  });

  it("разрешает конфликты Tailwind классов", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("обрабатывает undefined и null", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });

  it("возвращает пустую строку для пустого ввода", () => {
    expect(cn()).toBe("");
  });

  it("разрешает сложные конфликты Tailwind", () => {
    expect(cn("p-4", "px-2")).toBe("p-4 px-2");
    expect(cn("bg-red-500 hover:bg-red-600", "bg-blue-500")).toBe("hover:bg-red-600 bg-blue-500");
  });
});
