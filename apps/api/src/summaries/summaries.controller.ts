import { InjectQueue } from "@nestjs/bullmq";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Queue } from "bullmq";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SummariesService } from "./summaries.service";
import { SummarizerService } from "./summarizer.service";

@ApiTags("summaries")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("summaries")
export class SummariesController {
  constructor(
    private summaries: SummariesService,
    private summarizer: SummarizerService,
    @InjectQueue("summaries") private summariesQueue: Queue
  ) {}

  @Get("topics")
  @ApiOperation({ summary: "Все уникальные темы саммари" })
  getTopics(@Request() req: { user: { userId: string } }) {
    return this.summaries.getTopics(req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: "Список саммари" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "topic", required: false, type: String })
  @ApiQuery({ name: "channelId", required: false, type: String })
  findAll(
    @Request() req: { user: { userId: string } },
    @Query("page") page = "1",
    @Query("limit") limit = "10",
    @Query("topic") topic?: string,
    @Query("channelId") channelId?: string
  ) {
    return this.summaries.findAll(req.user.userId, +page, +limit, undefined, topic, channelId);
  }

  @Post("generate")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Поставить саммари в очередь генерации (202 Accepted)" })
  async generate(@Request() req: { user: { userId: string } }, @Body() body?: { force?: boolean }) {
    const force = body?.force === true;
    const job = await this.summariesQueue.add("generate", {
      userId: req.user.userId,
      force,
    });
    return { jobId: job.id };
  }

  @Post("generate/folder")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Сгенерировать саммари для папки (202 Accepted)" })
  async generateForFolder(
    @Request() req: { user: { userId: string } },
    @Body()
    body: { telegramIds: string[]; folderId: number; folderTitle: string }
  ) {
    const job = await this.summariesQueue.add("generate", {
      userId: req.user.userId,
      telegramIds: body.telegramIds,
      folderId: body.folderId,
      folderTitle: body.folderTitle,
    });
    return { jobId: job.id };
  }

  @Post("generate/channel/:channelId")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Сгенерировать саммари для конкретного канала/группы (202 Accepted)" })
  async generateForChannel(
    @Request() req: { user: { userId: string } },
    @Param("channelId") channelId: string
  ) {
    const job = await this.summariesQueue.add("generate", {
      userId: req.user.userId,
      channelId,
    });
    return { jobId: job.id };
  }

  @Get("jobs/:jobId")
  @ApiOperation({ summary: "Статус задачи генерации саммари" })
  async getJobStatus(@Param("jobId") jobId: string) {
    const job = await this.summariesQueue.getJob(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);
    const state = await job.getState();
    return {
      status: state,
      summaryId:
        state === "completed" ? (job.returnvalue as { summaryId: string })?.summaryId : undefined,
      error: state === "failed" ? job.failedReason : undefined,
    };
  }

  @Post(":id/regenerate")
  @ApiOperation({ summary: "Перегенерировать саммари" })
  async regenerate(@Request() req: { user: { userId: string } }, @Param("id") id: string) {
    try {
      const summary = await this.summarizer.regenerate(req.user.userId, id);
      return { success: true, summary };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to regenerate summary";
      throw new HttpException({ success: false, error: message }, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Удалить саммари" })
  remove(@Request() req: { user: { userId: string } }, @Param("id") id: string) {
    return this.summaries.remove(req.user.userId, id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Детали саммари" })
  findOne(@Request() req: { user: { userId: string } }, @Param("id") id: string) {
    return this.summaries.findOne(req.user.userId, id);
  }
}
