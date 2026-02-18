import { Controller, Get, Param, Query, Request, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SummariesService } from "./summaries.service";

@ApiTags("summaries")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("summaries")
export class SummariesController {
  constructor(private summaries: SummariesService) {}

  @Get()
  @ApiOperation({ summary: "Список саммари" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "type", required: false, enum: ["daily", "weekly"] })
  findAll(
    @Request() req: { user: { userId: string } },
    @Query("page") page = "1",
    @Query("limit") limit = "10",
    @Query("type") type?: string
  ) {
    return this.summaries.findAll(req.user.userId, +page, +limit, type);
  }

  @Get(":id")
  @ApiOperation({ summary: "Детали саммари" })
  findOne(@Request() req: { user: { userId: string } }, @Param("id") id: string) {
    return this.summaries.findOne(req.user.userId, id);
  }
}
