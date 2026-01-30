import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Объединяет CSS-классы с помощью clsx и tailwind-merge.
 * Обрабатывает условные классы, массивы и объекты,
 * корректно разрешая конфликты Tailwind CSS классов.
 *
 * @param inputs - Значения классов (строки, массивы, объекты или условия)
 * @returns Объединённая строка классов без конфликтов
 *
 * @example
 * cn("px-2 py-1", "px-4") // => "py-1 px-4"
 * cn("text-red-500", { "text-blue-500": true }) // => "text-blue-500"
 * cn("base-class", isActive && "active-class")
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
