import { ApiProperty } from "@nestjs/swagger";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { IsObject, IsString } from "class-validator";

export class PasskeyAuthVerifyDto {
  @ApiProperty({ description: "ID возвращённый из /passkey/login/options" })
  @IsString()
  challengeId: string;

  @ApiProperty({ description: "WebAuthn authentication response from the browser" })
  @IsObject()
  response: AuthenticationResponseJSON;
}
