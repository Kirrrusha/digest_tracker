import { z } from "zod";

export const createSummarySchema = z.object({
  period: z.string(),
  type: z.enum(["daily", "weekly"]),
});
