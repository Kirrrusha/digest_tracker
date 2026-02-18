import { ApiProperty } from "@nestjs/swagger";
import { IsUrl } from "class-validator";

export class CreateChannelDto {
  @ApiProperty({ example: "https://t.me/example" })
  @IsUrl()
  url: string;
}
