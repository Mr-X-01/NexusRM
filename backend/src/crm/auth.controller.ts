import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser as UserFromToken } from "../security/current-user.decorator";
import type { CurrentUser } from "../security/current-user.decorator";
import { Public } from "../security/public.decorator";
import { AuthService } from "./auth.service";
import { LoginDto, RefreshDto, RegisterDto } from "./dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post("refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Post("logout")
  logout(@UserFromToken() user: CurrentUser) {
    return this.auth.logout(user.sub);
  }

  @ApiBearerAuth()
  @Get("me")
  me(@UserFromToken() user: CurrentUser) {
    return user;
  }
}
