import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString } from "class-validator";

export class CreateSummaryDto {
  @ApiProperty({ example: "daily-2024-01-25" })
  @IsString()
  period: string;

  @ApiProperty({ enum: ["daily", "weekly"] })
  @IsIn(["daily", "weekly"])
  type: "daily" | "weekly";
}
