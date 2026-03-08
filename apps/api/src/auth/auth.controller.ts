import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { AuthService } from "./auth.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { SetPasswordDto } from "./dto/set-password.dto";
import { JwtAuthGuard, JwtRefreshGuard } from "./jwt-auth.guard";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Регистрация email + password" })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Логин → accessToken + refreshToken" })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @ApiOperation({ summary: "Обновить токены" })
  refresh(@Request() req: { user: { userId: string; tokenId: string } }) {
    return this.auth.refresh(req.user.userId, req.user.tokenId);
  }

  @Patch("change-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Сменить пароль" })
  changePassword(@Request() req: { user: { userId: string } }, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(req.user.userId, dto);
  }

  @Patch("set-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Установить пароль без проверки текущего (для авторизованных через passkey)",
  })
  setPassword(@Request() req: { user: { userId: string } }, @Body() dto: SetPasswordDto) {
    return this.auth.setPassword(req.user.userId, dto.newPassword, dto.login);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Выход — инвалидировать refresh-токен" })
  logout(@Request() req: { user: { userId: string }; body: { tokenId?: string } }) {
    return this.auth.logout(req.user.userId, req.body.tokenId ?? "");
  }
}
