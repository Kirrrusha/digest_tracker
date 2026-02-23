import { Module } from "@nestjs/common";

import { MtprotoModule } from "../mtproto/mtproto.module";
import { PostsController } from "./posts.controller";
import { PostsService } from "./posts.service";

@Module({
  imports: [MtprotoModule],
  providers: [PostsService],
  controllers: [PostsController],
})
export class PostsModule {}
