import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";

import { SummarizerService } from "./summarizer.service";

interface GenerateJobData {
  userId: string;
  type: "daily" | "weekly";
  force: boolean;
  channelId?: string;
  telegramIds?: string[];
  folderId?: number;
  folderTitle?: string;
}

@Processor("summaries")
export class SummariesProcessor extends WorkerHost {
  constructor(private readonly summarizer: SummarizerService) {
    super();
  }

  async process(job: Job<GenerateJobData>): Promise<{ summaryId: string }> {
    const { userId, type, force, channelId, telegramIds, folderId, folderTitle } = job.data;

    if (telegramIds && folderId !== undefined && folderTitle) {
      const summary = await this.summarizer.generateForFolder(
        userId,
        telegramIds,
        folderId,
        folderTitle,
        force
      );
      return { summaryId: summary.id };
    }

    if (channelId) {
      const summary = await this.summarizer.generateForChannel(userId, channelId);
      return { summaryId: summary.id };
    }

    const summary =
      type === "weekly"
        ? await this.summarizer.generateWeekly(userId, force)
        : await this.summarizer.generateDaily(userId, force);
    return { summaryId: summary.id };
  }
}
