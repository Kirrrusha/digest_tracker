import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { MtprotoService } from "../mtproto/mtproto.service";
import { PostsService } from "./posts.service";

@ApiTags("posts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PostsController {
  constructor(
    private posts: PostsService,
    private mtproto: MtprotoService
  ) {}

  @Get("posts")
  @ApiOperation({ summary: "Все посты пользователя" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "channelId", required: false, type: String })
  findAll(
    @Request() req: { user: { userId: string } },
    @Query("page") page = "1",
    @Query("limit") limit = "20",
    @Query("channelId") channelId?: string
  ) {
    return this.posts.findAll(req.user.userId, +page, +limit, channelId);
  }

  @Get("channels/:channelId/posts")
  @ApiOperation({ summary: "Посты канала" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  findByChannel(
    @Request() req: { user: { userId: string } },
    @Param("channelId") channelId: string,
    @Query("page") page = "1",
    @Query("limit") limit = "20"
  ) {
    return this.posts.findByChannel(req.user.userId, channelId, +page, +limit);
  }

  @Post("channels/:channelId/sync")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Синхронизировать посты канала из Telegram" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  syncChannel(
    @Request() req: { user: { userId: string } },
    @Param("channelId") channelId: string,
    @Query("limit") limit = "50"
  ) {
    return this.mtproto.fetchAndSaveChannelPosts(req.user.userId, channelId, +limit);
  }

  @Get("posts/:id")
  @ApiOperation({ summary: "Детали поста" })
  findOne(@Param("id") id: string) {
    return this.posts.findOne(id);
  }
}
