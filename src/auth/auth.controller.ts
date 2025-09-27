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
  constructor(private readonly authService: AuthService) {
    console.log('🏗️  AuthController initialized');
  }

  // Google OAuth2 login endpoint
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    console.log('🎯 INITIAL GOOGLE AUTH ROUTE HIT!');
    console.log('Request URL:', req.url);
    console.log('Request method:', req.method);
    console.log('User Agent:', req.headers['user-agent']);
    console.log('Referer:', req.headers.referer);
    // This will redirect to Google - no explicit return needed
  }

  // Google OAuth2 callback endpoint
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    // This log should ALWAYS appear if the endpoint is hit
    console.log('🚀 CALLBACK ENDPOINT HIT!!!');
    console.log('Full request URL:', req.url);
    console.log('Query params:', req.query);
    console.log('Request method:', req.method);
    console.log('Request headers:', req.headers);

    try {
      console.log('✅ Starting callback processing...');
      const googleUser = req.user as User;
      console.log('📋 Google user from request:', googleUser);

      if (!googleUser) {
        console.error('❌ No Google user found in request!');
        throw new Error('No Google user data received from OAuth');
      }

      console.log('🔍 Calling findOrCreateUser...');
      const myAppUser = await this.authService.findOrCreateUser(googleUser);
      console.log('✅ App user result:', {
        id: myAppUser?.id,
        email: myAppUser?.email,
        googleId: myAppUser?.googleId,
      });

      console.log('🔐 Calling login service...');
      const loginResponse = await this.authService.login(myAppUser);
      console.log('✅ Login response generated:', {
        hasAccessToken: !!loginResponse.access_token,
        hasRefreshToken: !!loginResponse.refresh_token,
        hasUser: !!loginResponse.user,
      });

      console.log('📤 Sending success response to frontend...');
      const responseHtml = `
      <html>
        <head>
          <title>Authentication Success</title>
        </head>
        <body>
          <script>
            console.log('🎉 OAuth success script executing');
            console.log('Window opener exists:', !!window.opener);
            console.log('Frontend URL:', '${process.env.FRONTEND_URL}');
            
            if (window.opener) {
              try {
                const message = {
                  type: 'OAUTH_SUCCESS',
                  token: '${loginResponse.access_token}',
                  refreshToken: '${loginResponse.refresh_token || ''}',
                  expiresAt: ${loginResponse.expires_at || 'null'},
                  user: ${JSON.stringify(loginResponse.user)}
                };
                console.log('📨 Sending message:', message);
                window.opener.postMessage(message, '${process.env.FRONTEND_URL}');
                console.log('✅ Message sent successfully');
              } catch (e) {
                console.error('❌ Error sending message:', e);
              }
            } else {
              console.error('❌ No window.opener found');
            }
            
            setTimeout(() => {
              console.log('🔒 Closing window...');
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
      console.error('💥 OAuth callback error:', error);
      console.error('Error stack:', error.stack);

      const errorHtml = `
      <html>
        <head>
          <title>Authentication Error</title>
        </head>
        <body>
          <script>
            console.error('❌ OAuth error script executing');
            console.log('Window opener exists:', !!window.opener);
            
            if (window.opener) {
              try {
                const errorMessage = {
                  type: 'OAUTH_ERROR',
                  message: 'Authentication failed: ${(error.message || 'Unknown error').replace(/'/g, "\\'")}'
                };
                console.log('📨 Sending error message:', errorMessage);
                window.opener.postMessage(errorMessage, '${process.env.FRONTEND_URL}');
                console.log('✅ Error message sent');
              } catch (e) {
                console.error('❌ Error sending error message:', e);
              }
            }
            
            setTimeout(() => {
              console.log('🔒 Closing error window...');
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
    console.log('🧪 Test endpoint hit!');
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
    console.log('👤 Profile endpoint hit');
    return req.user;
  }

  // Manual login endpoint (if needed for other auth methods)
  @Post('login')
  async login(
    @Body() body: { email: string; password?: string },
  ): Promise<LoginResponse> {
    console.log('📝 Manual login attempted');
    throw new UnauthorizedException('Please use Google OAuth for login');
  }

  // Logout endpoint (client-side token removal)
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout() {
    console.log('👋 Logout endpoint hit');
    return { message: 'Logged out successfully' };
  }

  // Validate token endpoint
  @Get('validate')
  @UseGuards(JwtAuthGuard)
  async validateToken() {
    console.log('🔐 Token validation endpoint hit');
    return { valid: true, message: 'Token is valid' };
  }

  // Refresh token endpoint
  @Post('refresh')
  async refreshToken(@Body() body: { refreshToken: string }) {
    console.log('🔄 Refresh token endpoint hit');

    if (!body.refreshToken) {
      console.log('❌ No refresh token provided');
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const result = await this.authService.refreshAccessToken(
        body.refreshToken,
      );
      console.log('✅ Token refreshed successfully');
      return result;
    } catch (error) {
      console.error('❌ Token refresh failed:', error.message);
      throw new UnauthorizedException(error.message);
    }
  }

  // Revoke refresh token (logout from all devices)
  @Post('revoke')
  @UseGuards(JwtAuthGuard)
  async revokeToken(@Req() req, @Body() body?: { refreshToken?: string }) {
    console.log('🚫 Revoke token endpoint hit');

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
