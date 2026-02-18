import { z } from "zod";

export const createChannelSchema = z.object({
  url: z.string().url("Некорректный URL"),
});
