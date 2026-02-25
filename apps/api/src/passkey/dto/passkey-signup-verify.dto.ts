import { ApiProperty } from "@nestjs/swagger";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { IsObject, IsString } from "class-validator";

export class PasskeySignupVerifyDto {
  @ApiProperty()
  @IsString()
  challengeId: string;

  @ApiProperty({ description: "WebAuthn registration response from the browser" })
  @IsObject()
  response: RegistrationResponseJSON;
}
