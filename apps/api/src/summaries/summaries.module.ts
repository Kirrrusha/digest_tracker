import { Module } from "@nestjs/common";

import { SummariesController } from "./summaries.controller";
import { SummariesService } from "./summaries.service";

@Module({
  providers: [SummariesService],
  controllers: [SummariesController],
})
export class SummariesModule {}
