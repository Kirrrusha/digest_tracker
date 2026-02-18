import { Controller, Get, Param, Query, Request, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PostsService } from "./posts.service";

@ApiTags("posts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PostsController {
  constructor(private posts: PostsService) {}

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

  @Get("posts/:id")
  @ApiOperation({ summary: "Детали поста" })
  findOne(@Param("id") id: string) {
    return this.posts.findOne(id);
  }
}
