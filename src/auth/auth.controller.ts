import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Res,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService, LoginResponse } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from 'src/user/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Google OAuth2 login endpoint
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  // Google OAuth2 callback endpoint
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    try {
      const googleUser = req.user as User;

      const myAppUser = await this.authService.findOrCreateUser(googleUser);
      const loginResponse = await this.authService.login(myAppUser);

      return res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'OAUTH_SUCCESS',
              token: '${loginResponse.access_token}',
              user: ${JSON.stringify(loginResponse.user)}
            }, '${process.env.FRONTEND_URL}');
            window.close();
          </script>
        </body>
      </html>
    `);
    } catch (error) {
      return res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'OAUTH_ERROR',
              message: '${error.message}'
            }, '${process.env.FRONTEND_URL}');
            window.close();
          </script>
        </body>
      </html>
    `);
    }
  }

  // Get current user profile (protected route)

  // Manual login endpoint (if needed for other auth methods)
  @Post('login')
  async login(
    @Body() body: { email: string; password?: string },
  ): Promise<LoginResponse> {
    // For Google OAuth, this might not be needed, but kept for completeness
    throw new UnauthorizedException('Please use Google OAuth for login');
  }

  // Logout endpoint (client-side token removal)
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout() {
    // JWT is stateless, so logout is handled client-side by removing the token
    return { message: 'Logged out successfully' };
  }

  // Validate token endpoint
  @Get('validate')
  @UseGuards(JwtAuthGuard)
  async validateToken() {
    return { valid: true, message: 'Token is valid' };
  }

  // Get all users (admin functionality)
  // @Get('users')
  // @UseGuards(JwtAuthGuard)
  // async getAllUsers() {
  //   return this.authService.getAllUsers();
  //}
}
