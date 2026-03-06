import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { MtprotoModule } from "../mtproto/mtproto.module";
import { SummariesController } from "./summaries.controller";
import { SummariesProcessor } from "./summaries.processor";
import { SummariesService } from "./summaries.service";
import { SummarizerService } from "./summarizer.service";

@Module({
  imports: [BullModule.registerQueue({ name: "summaries" }), MtprotoModule],
  providers: [SummariesService, SummarizerService, SummariesProcessor],
  controllers: [SummariesController],
})
export class SummariesModule {}
