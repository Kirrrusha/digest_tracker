import { Module } from "@nestjs/common";

import { MtprotoController } from "./mtproto.controller";
import { MtprotoService } from "./mtproto.service";

@Module({
  providers: [MtprotoService],
  controllers: [MtprotoController],
})
export class MtprotoModule {}
