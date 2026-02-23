import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from "class-validator";

export class MtprotoChannelItemDto {
  @ApiProperty()
  @IsString()
  telegramId: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  username?: string | null;

  @ApiProperty()
  @IsString()
  accessHash: string;
}

export class BulkAddChannelsDto {
  @ApiProperty({ type: [MtprotoChannelItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MtprotoChannelItemDto)
  channels: MtprotoChannelItemDto[];
}
