import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ChannelsService } from "./channels.service";
import { CreateChannelDto } from "./dto/create-channel.dto";
import { UpdateChannelDto } from "./dto/update-channel.dto";

@ApiTags("channels")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("channels")
export class ChannelsController {
  constructor(private channels: ChannelsService) {}

  @Get()
  @ApiOperation({ summary: "Список каналов пользователя" })
  findAll(@Request() req: { user: { userId: string } }) {
    return this.channels.findAll(req.user.userId);
  }

  @Post()
  @ApiOperation({ summary: "Добавить канал" })
  create(@Request() req: { user: { userId: string } }, @Body() dto: CreateChannelDto) {
    return this.channels.create(req.user.userId, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Детали канала" })
  findOne(@Request() req: { user: { userId: string } }, @Param("id") id: string) {
    return this.channels.findOne(req.user.userId, id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Обновить канал" })
  update(
    @Request() req: { user: { userId: string } },
    @Param("id") id: string,
    @Body() dto: UpdateChannelDto
  ) {
    return this.channels.update(req.user.userId, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Удалить канал" })
  remove(@Request() req: { user: { userId: string } }, @Param("id") id: string) {
    return this.channels.remove(req.user.userId, id);
  }
}
