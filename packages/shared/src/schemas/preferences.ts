import { z } from "zod";

export const updatePreferencesSchema = z.object({
  topics: z.array(z.string()).optional(),
  language: z.string().optional(),
  notificationsEnabled: z.boolean().optional(),
  notificationTime: z.string().nullable().optional(),
  telegramNotifications: z.boolean().optional(),
  notifyOnNewSummary: z.boolean().optional(),
  notifyOnNewPosts: z.boolean().optional(),
});
