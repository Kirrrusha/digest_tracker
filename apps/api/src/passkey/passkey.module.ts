import { Module } from "@nestjs/common";

import { PasskeyController } from "./passkey.controller";
import { PasskeyService } from "./passkey.service";

@Module({
  providers: [PasskeyService],
  controllers: [PasskeyController],
})
export class PasskeyModule {}
