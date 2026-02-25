import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { IsObject, IsOptional, IsString } from "class-validator";

export class PasskeyRegisterVerifyDto {
  @ApiProperty({ description: "WebAuthn registration response from the browser" })
  @IsObject()
  response: RegistrationResponseJSON;

  @ApiPropertyOptional({ example: "MacBook Touch ID" })
  @IsOptional()
  @IsString()
  name?: string;
}
