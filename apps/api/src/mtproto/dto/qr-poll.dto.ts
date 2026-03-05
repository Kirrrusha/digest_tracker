import { IsString } from "class-validator";

export class QrPollDto {
  @IsString()
  sessionString: string;
}
