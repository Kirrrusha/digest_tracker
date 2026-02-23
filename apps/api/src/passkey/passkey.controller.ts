import { Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

// TODO: реализовать WebAuthn flow
@ApiTags("passkey")
@Controller("passkey")
export class PasskeyController {
  @Post("register/options")
  @ApiOperation({ summary: "WebAuthn registration options" })
  registerOptions() {
    return { message: "Not implemented" };
  }

  @Post("register/verify")
  @ApiOperation({ summary: "Создать passkey" })
  registerVerify() {
    return { message: "Not implemented" };
  }

  @Post("login/options")
  @ApiOperation({ summary: "WebAuthn authentication options" })
  loginOptions() {
    return { message: "Not implemented" };
  }

  @Post("login/verify")
  @ApiOperation({ summary: "Войти через passkey" })
  loginVerify() {
    return { message: "Not implemented" };
  }
}
