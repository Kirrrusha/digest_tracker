import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";

import { SummarizerService } from "./summarizer.service";

interface GenerateJobData {
  userId: string;
  type: "daily" | "weekly";
  force: boolean;
}

@Processor("summaries")
export class SummariesProcessor extends WorkerHost {
  constructor(private readonly summarizer: SummarizerService) {
    super();
  }

  async process(job: Job<GenerateJobData>): Promise<{ summaryId: string }> {
    const { userId, type, force } = job.data;
    const summary =
      type === "weekly"
        ? await this.summarizer.generateWeekly(userId, force)
        : await this.summarizer.generateDaily(userId, force);
    return { summaryId: summary.id };
  }
}
