import { IsString } from "class-validator";

export class QrVerify2faDto {
  @IsString()
  sessionString: string;

  @IsString()
  password: string;
}
