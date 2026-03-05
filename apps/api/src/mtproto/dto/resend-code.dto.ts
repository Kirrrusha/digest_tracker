import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches } from "class-validator";

export class ResendCodeDto {
  @ApiProperty({ example: "+79001234567" })
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: "Используйте международный формат: +7XXXXXXXXXX" })
  phoneNumber: string;

  @ApiProperty()
  @IsString()
  phoneCodeHash: string;

  @ApiProperty()
  @IsString()
  sessionString: string;
}
