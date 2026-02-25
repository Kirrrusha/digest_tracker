import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";

export class PasskeySignupOptionsDto {
  @ApiPropertyOptional({ example: "Иван Иванов" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}
