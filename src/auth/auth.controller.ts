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
import { AuthService, LoginResponse } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from 'src/user/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Google OAuth2 login endpoint
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {}

  // Google OAuth2 callback endpoint
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    try {
      const googleUser = req.user as User;

      if (!googleUser) {
        throw new Error('No Google user data received from OAuth');
      }

      const myAppUser = await this.authService.findOrCreateUser(googleUser);
      const loginResponse = await this.authService.login(myAppUser);

      const responseHtml = `
      <html>
        <head>
          <title>Authentication Success</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              try {
                const message = {
                  type: 'OAUTH_SUCCESS',
                  token: '${loginResponse.access_token}',
                  refreshToken: '${loginResponse.refresh_token || ''}',
                  expiresAt: ${loginResponse.expires_at || 'null'},
                  user: ${JSON.stringify(loginResponse.user)}
                };
                window.opener.postMessage(message, '${process.env.FRONTEND_URL}');
              } catch (e) {
                console.error('Error sending message:', e);
              }
            }
            
            setTimeout(() => {
              window.close();
            }, 1000);
          </script>
          <div style="text-align: center; font-family: Arial, sans-serif; margin-top: 50px;">
            <h2>🎉 Authentication Successful!</h2>
            <p>Redirecting back to the application...</p>
            <p><small>This window will close automatically.</small></p>
          </div>
        </body>
      </html>
    `;

      return res.send(responseHtml);
    } catch (error) {
      const errorHtml = `
      <html>
        <head>
          <title>Authentication Error</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              try {
                const errorMessage = {
                  type: 'OAUTH_ERROR',
                  message: 'Authentication failed: ${(error.message || 'Unknown error').replace(/'/g, "\\'")}'
                };
                window.opener.postMessage(errorMessage, '${process.env.FRONTEND_URL}');
              } catch (e) {
                console.error('Error sending error message:', e);
              }
            }
            
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
          <div style="text-align: center; font-family: Arial, sans-serif; margin-top: 50px; color: #d32f2f;">
            <h2>❌ Authentication Failed</h2>
            <p>${error.message || 'An unexpected error occurred during authentication'}</p>
            <p><small>This window will close automatically in 3 seconds.</small></p>
          </div>
        </body>
      </html>
    `;

      return res.send(errorHtml);
    }
  }

  // Test endpoint to verify routes are working
  @Get('test')
  async testEndpoint() {
    return {
      message: 'Auth controller is working!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    };
  }

  // Get current user profile (protected route)
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req) {
    return req.user;
  }

  // Manual login endpoint (if needed for other auth methods)
  @Post('login')
  async login(
    @Body() body: { email: string; password?: string },
  ): Promise<LoginResponse> {
    throw new UnauthorizedException('Please use Google OAuth for login');
  }

  // Logout endpoint (client-side token removal)
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout() {
    return { message: 'Logged out successfully' };
  }

  // Validate token endpoint
  @Get('validate')
  @UseGuards(JwtAuthGuard)
  async validateToken() {
    return { valid: true, message: 'Token is valid' };
  }

  // Refresh token endpoint
  @Post('refresh')
  async refreshToken(@Body() body: { refreshToken: string }) {
    if (!body.refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const result = await this.authService.refreshAccessToken(
        body.refreshToken,
      );
      return result;
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }

  // Revoke refresh token (logout from all devices)
  @Post('revoke')
  @UseGuards(JwtAuthGuard)
  async revokeToken(@Req() req, @Body() body?: { refreshToken?: string }) {
    const userId = req.user.sub || req.user.id;

    if (body?.refreshToken) {
      // Revoke specific refresh token
      await this.authService.revokeRefreshToken(userId);
    } else {
      // Revoke all tokens for user
      await this.authService.revokeAllUserTokens(userId);
    }

    return { message: 'Token(s) revoked successfully' };
  }
}
