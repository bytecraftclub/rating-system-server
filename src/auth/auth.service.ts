import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
}

// auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(User) // Assuming you use TypeORM
    private userRepository: Repository<User>,
  ) {}

  // Fixed version of your auth service methods

  async findOrCreateUser(googleUser: any) {
    console.log('Google user data:', googleUser);

    try {
      // 1. Try to find a user by their Google ID first
      let user = await this.userRepository.findOneBy({
        googleId: googleUser.id,
      });

      if (user) {
        console.log('Found existing user by Google ID:', user.id);

        // Update user info (in case they changed their Google profile)
        user.email = googleUser.email;
        user.firstName = googleUser.firstName;
        user.lastName = googleUser.lastName;
        user.avatar = googleUser.picture;

        // Generate new refresh token for this login session
        const newRefreshToken = this.jwtService.sign(
          { email: googleUser.email, sub: googleUser.id },
          { expiresIn: '30d' },
        );
        user.refreshtoken = newRefreshToken;

        await this.userRepository.save(user);
        console.log('Updated existing user');
        return user;
      }

      // 2. If not found by Google ID, try to find by email
      user = await this.userRepository.findOneBy({ email: googleUser.email });

      if (user) {
        console.log('Found existing user by email, linking Google account');

        // Link Google account to existing user
        user.googleId = googleUser.id;
        user.firstName = googleUser.firstName || user.firstName;
        user.lastName = googleUser.lastName || user.lastName;
        user.avatar = googleUser.picture || user.avatar;

        // Generate refresh token
        const newRefreshToken = this.jwtService.sign(
          { email: googleUser.email, sub: googleUser.id },
          { expiresIn: '30d' },
        );
        user.refreshtoken = newRefreshToken;

        await this.userRepository.save(user);
        console.log('Linked Google account to existing user');
        return user;
      }

      // 3. Create new user if none exists
      console.log('Creating new user for Google ID:', googleUser.id);

      const refreshToken = this.jwtService.sign(
        { email: googleUser.email, sub: googleUser.id },
        { expiresIn: '30d' },
      );

      const newUser = this.userRepository.create({
        email: googleUser.email,
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        avatar: googleUser.picture,
        googleId: googleUser.id,
        refreshtoken: refreshToken, // Make sure this matches your entity property name
      });

      console.log('New user object before save:', newUser);
      const savedUser = await this.userRepository.save(newUser);
      console.log('Saved new user:', savedUser);

      return savedUser;
    } catch (error) {
      console.error('Error in findOrCreateUser:', error);

      // Handle unique constraint violations
      if (error.code === '23505' || error.message.includes('duplicate key')) {
        console.log('Duplicate key error, trying to find existing user again');

        // Try to find the user again (race condition handling)
        const existingUser = await this.userRepository.findOneBy({
          email: googleUser.email,
        });

        if (existingUser) {
          // Link Google ID if not already linked
          if (!existingUser.googleId) {
            existingUser.googleId = googleUser.id;
            await this.userRepository.save(existingUser);
          }
          return existingUser;
        }
      }

      throw error;
    }
  }

  async login(user: User) {
    console.log('Logging in user:', user);

    // Create JWT payload
    const payload = {
      email: user.email,
      sub: user.googleId || user.id, // Use googleId if available, otherwise user.id
    };

    // Generate access token (short-lived)
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });

    // Calculate expiry time
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour from now

    return {
      access_token: accessToken,
      refresh_token: user.refreshtoken, // Changed from refreshtoken to refresh_token for consistency
      expires_at: expiresAt,
      user: {
        id: user.googleId || user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim() || user.firstName,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
      },
    };
  }

  async login2(user: User): Promise<LoginResponse> {
    const payload = {
      sub: user.googleId,
      email: user.email,
      name: user.firstName,
    };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: user.refreshtoken,
      user: {
        id: user.googleId,
        email: user.email,
        name: user.firstName,
        picture: user.avatar,
      },
    };
  }
  async validateGoogleUser(profile: any) {
    console.log('🔍 validateGoogleUser called with profile:', profile.id);

    // Transform Google profile to our expected format
    const googleUser = {
      id: profile.id,
      email: profile.emails?.[0]?.value,
      firstName:
        profile.name?.givenName ||
        profile.displayName?.split(' ')[0] ||
        'Unknown',
      lastName:
        profile.name?.familyName ||
        profile.displayName?.split(' ').slice(1).join(' ') ||
        'User',
      picture: profile.photos?.[0]?.value || null,
    };

    console.log('🔄 Transformed Google user:', googleUser);

    if (!googleUser.email) {
      throw new Error('No email provided by Google');
    }

    // Use your existing findOrCreateUser method
    return await this.findOrCreateUser(googleUser);
  }

  async validateJwtPayload(payload: any): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { googleId: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid token or inactive user');
    }

    return user;
  }

  async findUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { googleId: id } });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async deactivateUser(id: string): Promise<void> {
    await this.userRepository.update(id, { isActive: false });
  }
  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find({
      select: [
        'googleId',
        'email',
        'firstName',
        'lastName',
        'avatar',
        'isActive',
        'score',
      ],
    });
  }

  async refreshAccessToken(refreshToken: string) {
    console.log('🔄 Refreshing access token...');

    try {
      // 1. Verify the refresh token
      console.log('🔍 Verifying refresh token...');
      const decoded = this.jwtService.verify(refreshToken);
      console.log('✅ Refresh token verified for user:', decoded.sub);

      // 2. Find the user by the token's subject (Google ID)
      const user = await this.userRepository.findOne({
        where: { googleId: decoded.sub },
      });

      if (!user) {
        console.log('❌ User not found for refresh token');
        throw new Error('User not found');
      }

      // 3. Check if the stored refresh token matches
      if (user.refreshtoken !== refreshToken) {
        console.log('❌ Refresh token mismatch');
        throw new Error('Invalid refresh token');
      }

      // 4. Check if user is still active
      if (!user.isActive) {
        console.log('❌ User account is inactive');
        throw new Error('User account is inactive');
      }

      // 5. Generate new access token
      const payload = { email: user.email, sub: user.googleId };
      const newAccessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
      const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour from now

      console.log('✅ New access token generated');

      // 6. Optionally generate new refresh token for security (token rotation)
      const shouldRotateRefreshToken = true; // You can make this configurable
      let newRefreshToken = refreshToken;

      if (shouldRotateRefreshToken) {
        console.log('🔄 Rotating refresh token...');
        newRefreshToken = this.jwtService.sign(
          { email: user.email, sub: user.googleId },
          { expiresIn: '30d' },
        );

        // Update user's refresh token in database
        user.refreshtoken = newRefreshToken;
        await this.userRepository.save(user);
        console.log('✅ Refresh token rotated');
      }

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_at: expiresAt,
        user: {
          id: user.googleId || user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
        },
      };
    } catch (error) {
      console.error('❌ Refresh token error:', error.message);

      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      }

      throw error;
    }
  }

  async revokeRefreshToken(userId: string) {
    console.log('🚫 Revoking refresh token for user:', userId);

    const user = await this.userRepository.findOne({
      where: { googleId: userId },
    });

    if (user) {
      user.refreshtoken = '';
      await this.userRepository.save(user);
      console.log('✅ Refresh token revoked');
    }
  }

  async revokeAllUserTokens(userId: string) {
    console.log('🚫 Revoking all tokens for user:', userId);

    // In a more sophisticated setup, you might:
    // 1. Maintain a blacklist of tokens
    // 2. Use token versioning
    // 3. Store tokens in Redis with TTL

    // For now, just revoke the refresh token
    await this.revokeRefreshToken(userId);
  }
}
