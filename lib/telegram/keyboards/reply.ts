import { InlineKeyboard, Keyboard } from "grammy";

/**
 * Главная Reply клавиатура
 */
export function mainKeyboard(): Keyboard {
  return new Keyboard()
    .text("📊 Саммари")
    .text("📋 Каналы")
    .row()
    .text("⚙️ Настройки")
    .text("❓ Помощь")
    .resized()
    .persistent();
}

/**
 * Клавиатура настроек
 */
export function settingsKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🔔 Уведомления", "toggle_notifications")
    .row()
    .text("📊 О новых саммари", "toggle_summary_notify")
    .row()
    .text("📝 О новых постах", "toggle_posts_notify")
    .row()
    .text("🌐 Язык", "show_language_options")
    .text("📅 Интервал", "show_interval_options");
}

/**
 * Клавиатура выбора языка
 */
export function languageKeyboard(currentLang: string): InlineKeyboard {
  const ruEmoji = currentLang === "ru" ? "✅" : "";
  const enEmoji = currentLang === "en" ? "✅" : "";

  return new InlineKeyboard()
    .text(`${ruEmoji} Русский`, "set_language_ru")
    .text(`${enEmoji} English`, "set_language_en")
    .row()
    .text("« Назад", "back_to_settings");
}

/**
 * Клавиатура выбора интервала
 */
export function intervalKeyboard(currentInterval: string): InlineKeyboard {
  const dailyEmoji = currentInterval === "daily" ? "✅" : "";
  const weeklyEmoji = currentInterval === "weekly" ? "✅" : "";

  return new InlineKeyboard()
    .text(`${dailyEmoji} Ежедневно`, "set_interval_daily")
    .text(`${weeklyEmoji} Еженедельно`, "set_interval_weekly")
    .row()
    .text("« Назад", "back_to_settings");
}

/**
 * Клавиатура списка каналов
 */
export function channelsKeyboard(
  channels: Array<{
    id: string;
    name: string;
    isActive: boolean;
  }>
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  channels.forEach((channel) => {
    const statusEmoji = channel.isActive ? "✅" : "⏸";
    keyboard.text(`${statusEmoji} ${channel.name}`, `channel_${channel.id}`).row();
  });

  return keyboard;
}

/**
 * Клавиатура действий с саммари
 */
export function summaryActionsKeyboard(summaryId: string): InlineKeyboard {
  return new InlineKeyboard()
    .webApp("📱 Открыть в Mini App", `${process.env.MINI_APP_URL}/summaries/${summaryId}`)
    .row()
    .text("🔄 Обновить", "generate_summary")
    .text("📤 Поделиться", `share_${summaryId}`);
}

/**
 * Клавиатура подтверждения
 */
export function confirmKeyboard(
  confirmCallback: string,
  cancelCallback: string = "cancel"
): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Да", confirmCallback)
    .text("❌ Нет", cancelCallback);
}

/**
 * Клавиатура с кнопкой открытия Mini App
 */
export function miniAppKeyboard(text: string = "📱 Открыть Mini App"): InlineKeyboard {
  return new InlineKeyboard().webApp(text, process.env.MINI_APP_URL || "");
}
