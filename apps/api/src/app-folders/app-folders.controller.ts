import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString, MinLength } from "class-validator";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AppFoldersService } from "./app-folders.service";

class CreateAppFolderDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channelIds?: string[];
}

class UpdateAppFolderDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channelIds?: string[];
}

@ApiTags("app-folders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("app-folders")
export class AppFoldersController {
  constructor(private service: AppFoldersService) {}

  @Get()
  @ApiOperation({ summary: "Список папок приложения" })
  findAll(@Request() req: { user: { userId: string } }) {
    return this.service.findAll(req.user.userId);
  }

  @Post()
  @ApiOperation({ summary: "Создать папку" })
  create(@Request() req: { user: { userId: string } }, @Body() dto: CreateAppFolderDto) {
    return this.service.create(req.user.userId, dto.name, dto.channelIds);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Обновить папку" })
  update(
    @Request() req: { user: { userId: string } },
    @Param("id") id: string,
    @Body() dto: UpdateAppFolderDto
  ) {
    return this.service.update(req.user.userId, id, dto.name, dto.channelIds);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Удалить папку" })
  remove(@Request() req: { user: { userId: string } }, @Param("id") id: string) {
    return this.service.remove(req.user.userId, id);
  }
}
