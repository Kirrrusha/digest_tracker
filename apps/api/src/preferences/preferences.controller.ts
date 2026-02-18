import { Body, Controller, Get, Put, Request, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";
import { PreferencesService } from "./preferences.service";

@ApiTags("preferences")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("preferences")
export class PreferencesController {
  constructor(private prefs: PreferencesService) {}

  @Get()
  @ApiOperation({ summary: "Настройки пользователя" })
  get(@Request() req: { user: { userId: string } }) {
    return this.prefs.get(req.user.userId);
  }

  @Put()
  @ApiOperation({ summary: "Обновить настройки" })
  update(@Request() req: { user: { userId: string } }, @Body() dto: UpdatePreferencesDto) {
    return this.prefs.update(req.user.userId, dto);
  }
}
