import { InlineKeyboard } from "grammy";

/**
 * Inline клавиатура для управления каналом
 */
export function channelControlKeyboard(channelId: string, isActive: boolean): InlineKeyboard {
  const toggleText = isActive ? "⏸ Приостановить" : "▶️ Возобновить";

  return new InlineKeyboard()
    .text(toggleText, `toggle_channel_${channelId}`)
    .row()
    .text("🗑 Удалить", `delete_channel_${channelId}`)
    .row()
    .text("« Назад к списку", "back_to_channels");
}

/**
 * Inline клавиатура для нового пользователя
 */
export function welcomeKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .webApp("📱 Открыть Mini App", process.env.MINI_APP_URL || "")
    .row()
    .text("📋 Добавить канал", "add_channel_guide")
    .text("❓ Помощь", "show_help");
}

/**
 * Inline клавиатура для пустого списка каналов
 */
export function emptyChannelsKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("➕ Как добавить канал?", "add_channel_guide")
    .row()
    .webApp("📱 Добавить через Mini App", `${process.env.MINI_APP_URL}/channels/add`);
}

/**
 * Inline клавиатура для ошибок
 */
export function errorKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🔄 Попробовать снова", "retry_action")
    .text("❓ Помощь", "show_help");
}

/**
 * Inline клавиатура для шаринга саммари
 */
export function shareSummaryKeyboard(summaryId: string): InlineKeyboard {
  return new InlineKeyboard()
    .switchInline("📤 Поделиться", summaryId)
    .row()
    .text("📋 Копировать ссылку", `copy_link_${summaryId}`);
}

/**
 * Inline клавиатура с WebApp кнопками
 */
export function webAppActionsKeyboard(): InlineKeyboard {
  const baseUrl = process.env.MINI_APP_URL || "";

  return new InlineKeyboard()
    .webApp("📊 Дашборд", baseUrl)
    .row()
    .webApp("📋 Каналы", `${baseUrl}/channels`)
    .webApp("📈 Саммари", `${baseUrl}/summaries`)
    .row()
    .webApp("⚙️ Настройки", `${baseUrl}/settings`);
}

/**
 * Inline клавиатура пагинации
 */
export function paginationKeyboard(
  currentPage: number,
  totalPages: number,
  callbackPrefix: string
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  if (currentPage > 1) {
    keyboard.text("« Назад", `${callbackPrefix}_page_${currentPage - 1}`);
  }

  keyboard.text(`${currentPage}/${totalPages}`, "noop");

  if (currentPage < totalPages) {
    keyboard.text("Вперед »", `${callbackPrefix}_page_${currentPage + 1}`);
  }

  return keyboard;
}
