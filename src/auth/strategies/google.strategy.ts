import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private authService: AuthService) {
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callbackURL =
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:3009/auth/google/callback';

    // Enhanced logging
    console.log('🔧 GoogleStrategy initializing...');
    console.log(
      'Client ID:',
      clientID ? `${clientID.substring(0, 20)}...` : '❌ NOT SET',
    );
    console.log('Client Secret:', clientSecret ? '✅ SET' : '❌ NOT SET');
    console.log('Callback URL:', callbackURL);

    if (!clientID || !clientSecret) {
      const errorMsg =
        'Google OAuth credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });

    this.logger.log('✅ Google Strategy initialized successfully');
    console.log('✅ Google Strategy initialized successfully');
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    console.log('🔍 GoogleStrategy validate method called!');
    console.log(
      'Access Token:',
      accessToken ? '✅ RECEIVED' : '❌ NOT RECEIVED',
    );
    console.log(
      'Refresh Token:',
      refreshToken ? '✅ RECEIVED' : '❌ NOT RECEIVED',
    );
    console.log('Profile received:', !!profile);

    if (profile) {
      console.log('📋 Google Profile Data:', {
        id: profile.id,
        displayName: profile.displayName,
        emails: profile.emails,
        photos: profile.photos,
        name: profile.name,
      });
    }

    try {
      console.log('🔄 Calling authService.validateGoogleUser...');

      // Call the method that actually exists in your auth service
      const user = await this.authService.validateGoogleUser(profile);

      console.log('✅ validateGoogleUser returned:', {
        id: user?.id,
        email: user?.email,
        googleId: user?.googleId,
      });

      console.log('🚀 Calling done() with user...');
      done(null, user);
    } catch (error) {
      console.error('❌ Error in GoogleStrategy validate:', error);
      this.logger.error('Error validating Google user:', error.stack);
      done(error, false);
    }
  }
}
