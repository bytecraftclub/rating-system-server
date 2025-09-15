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
  async googleAuth() {
    // This will redirect to Google's OAuth2 consent screen
  }

  // Google OAuth2 callback endpoint
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    try {
      const user = req.user as User;
      const loginResponse = await this.authService.login(user);

      // Redirect to frontend with token (adjust URL as needed)
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/success?token=${loginResponse.access_token}&user=${encodeURIComponent(JSON.stringify(loginResponse.user))}`,
      );
    } catch (error) {
      // Redirect to frontend with error
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/error?message=${encodeURIComponent(error.message)}`,
      );
    }
  }

  // Get current user profile (protected route)
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req) {
    const user = req.user as User;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      isActive: user.isActive,
      score: user.score,
    };
  }

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
  @Get('users')
  @UseGuards(JwtAuthGuard)
  async getAllUsers() {
    return this.authService.getAllUsers();
  }

  // Deactivate user (admin functionality)
  @Post('deactivate/:id')
  @UseGuards(JwtAuthGuard)
  async deactivateUser(@Req() req) {
    const params = req.params as { id: string };
    await this.authService.deactivateUser(params.id);
    return { message: 'User deactivated successfully' };
  }
}
