import { Module } from "@nestjs/common";

import { SummariesController } from "./summaries.controller";
import { SummariesService } from "./summaries.service";
import { SummarizerService } from "./summarizer.service";

@Module({
  providers: [SummariesService, SummarizerService],
  controllers: [SummariesController],
})
export class SummariesModule {}
