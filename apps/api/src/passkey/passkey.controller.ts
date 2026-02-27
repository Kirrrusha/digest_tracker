import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PasskeyAuthVerifyDto } from "./dto/passkey-auth-verify.dto";
import { PasskeyRegisterVerifyDto } from "./dto/passkey-register-verify.dto";
import { PasskeySignupOptionsDto } from "./dto/passkey-signup-options.dto";
import { PasskeySignupVerifyDto } from "./dto/passkey-signup-verify.dto";
import { PasskeyService } from "./passkey.service";

@ApiTags("passkey")
@Controller("passkey")
export class PasskeyController {
  constructor(private passkey: PasskeyService) {}

  // ---------- Management ----------

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Получить список passkey текущего пользователя" })
  listPasskeys(@Request() req: { user: { userId: string } }) {
    return this.passkey.listPasskeys(req.user.userId);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Удалить passkey" })
  deletePasskey(@Request() req: { user: { userId: string } }, @Param("id") id: string) {
    return this.passkey.deletePasskey(req.user.userId, id);
  }

  // ---------- Registration (requires auth — добавляем passkey к аккаунту) ----------

  @Post("register/options")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Получить WebAuthn options для регистрации passkey" })
  registerOptions(@Request() req: { user: { userId: string } }) {
    return this.passkey.registrationOptions(req.user.userId);
  }

  @Post("register/verify")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Верифицировать и сохранить passkey" })
  registerVerify(
    @Request() req: { user: { userId: string } },
    @Body() dto: PasskeyRegisterVerifyDto
  ) {
    return this.passkey.verifyRegistration(req.user.userId, dto.response, dto.name);
  }

  // ---------- Signup (новые пользователи без пароля, публичные) ----------

  @Post("signup/options")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Получить WebAuthn options для регистрации нового аккаунта через passkey",
  })
  signupOptions(@Body() dto: PasskeySignupOptionsDto) {
    return this.passkey.signupOptions(dto.name);
  }

  @Post("signup/verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Создать аккаунт через passkey и получить токены" })
  signupVerify(@Body() dto: PasskeySignupVerifyDto) {
    return this.passkey.verifySignup(dto.challengeId, dto.response);
  }

  // ---------- Authentication (публичные) ----------

  @Post("login/options")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Получить WebAuthn challenge для входа" })
  loginOptions() {
    return this.passkey.authenticationOptions();
  }

  @Post("login/verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Верифицировать passkey и получить токены" })
  loginVerify(@Body() dto: PasskeyAuthVerifyDto) {
    return this.passkey.verifyAuthentication(dto.challengeId, dto.response);
  }
}
