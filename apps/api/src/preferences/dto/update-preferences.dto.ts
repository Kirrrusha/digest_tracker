import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from "class-validator";

export class UpdatePreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topics?: string[];

  @ApiPropertyOptional({ enum: ["daily", "weekly"] })
  @IsOptional()
  @IsIn(["daily", "weekly"])
  summaryInterval?: "daily" | "weekly";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notificationTime?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  telegramNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyOnNewSummary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyOnNewPosts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  markTelegramAsRead?: boolean;
}
