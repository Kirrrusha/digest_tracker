import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { PasskeyController } from "./passkey.controller";
import { PasskeyService } from "./passkey.service";

@Module({
  imports: [AuthModule],
  providers: [PasskeyService],
  controllers: [PasskeyController],
})
export class PasskeyModule {}
