import { Module } from "@nestjs/common";

import { ChannelsController } from "./channels.controller";
import { ChannelsService } from "./channels.service";

@Module({
  providers: [ChannelsService],
  controllers: [ChannelsController],
  exports: [ChannelsService],
})
export class ChannelsModule {}
