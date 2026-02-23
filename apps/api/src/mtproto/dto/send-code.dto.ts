import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches } from "class-validator";

export class SendCodeDto {
  @ApiProperty({ example: "+79001234567" })
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: "Используйте международный формат: +7XXXXXXXXXX" })
  phoneNumber: string;
}
