import { Module } from "@nestjs/common";

import { AppFoldersController } from "./app-folders.controller";
import { AppFoldersService } from "./app-folders.service";

@Module({
  providers: [AppFoldersService],
  controllers: [AppFoldersController],
})
export class AppFoldersModule {}
