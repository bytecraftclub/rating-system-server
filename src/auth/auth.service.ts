import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async validateGoogleUser(profile: any): Promise<User> {
    const { id, emails, displayName, photos } = profile;
    const email = emails[0]?.value;

    // Check if email has @estin.dz domain
    if (!email || !email.endsWith('@estin.dz')) {
      throw new UnauthorizedException(
        'Only @estin.dz email addresses are allowed',
      );
    }

    const user: User = {
      id,
      email,
      name: displayName,
      picture: photos[0]?.value,
    };

    return user;
  }
  async login(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    };
  }

  async validateJwtPayload(payload: any): Promise<User> {
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  }
}
