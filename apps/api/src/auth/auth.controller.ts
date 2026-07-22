import { Controller, Post, Get, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }

  @Get('me')
  async me(@Headers('authorization') auth: string) {
    if (!auth || !auth.startsWith('Bearer ')) throw new UnauthorizedException();
    return this.auth.me(auth.slice(7));
  }

  @Post('logout')
  async logout(@Headers('authorization') auth: string) {
    if (!auth || !auth.startsWith('Bearer ')) throw new UnauthorizedException();
    return this.auth.logout(auth.slice(7));
  }
}
