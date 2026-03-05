import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsIn, IsOptional, IsString, ValidateNested } from "class-validator";

export class MtprotoGroupItemDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessHash?: string | null;

  @ApiProperty({ enum: ["group", "supergroup", "forum"] })
  @IsIn(["group", "supergroup", "forum"])
  groupType: "group" | "supergroup" | "forum";
}

export class BulkAddGroupsDto {
  @ApiProperty({ type: [MtprotoGroupItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MtprotoGroupItemDto)
  groups: MtprotoGroupItemDto[];
}
