import { IsOptional, IsString, MinLength } from "class-validator";

export class SetPasswordDto {
  @IsString()
  @MinLength(6)
  newPassword: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  login?: string;
}
