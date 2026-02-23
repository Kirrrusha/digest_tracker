import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class VerifyCodeDto {
  @ApiProperty()
  @IsString()
  phoneNumber: string;

  @ApiProperty()
  @IsString()
  phoneCode: string;

  @ApiProperty()
  @IsString()
  phoneCodeHash: string;

  @ApiProperty()
  @IsString()
  sessionString: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;
}
