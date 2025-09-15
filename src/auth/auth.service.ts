import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async validateGoogleUser(profile: any): Promise<User> {
    const { id, emails, displayName, photos } = profile;
    const email = emails[0]?.value;

    // Check if email has @estin.dz domain
    if (!email || !email.endsWith('@estin.dz')) {
      throw new UnauthorizedException(
        'Only @estin.dz email addresses are allowed',
      );
    }

    // Try to find existing user
    let user = await this.userRepository.findOne({
      where: { googleId: id },
    });

    if (!user) {
      // Create new user
      user = this.userRepository.create({
        googleId: id,
        email,
        name: displayName,
        picture: photos[0]?.value,
      });
      user = await this.userRepository.save(user);
    } else {
      // Update existing user info (in case profile changed)
      user.name = displayName;
      user.picture = photos[0]?.value;
      user = await this.userRepository.save(user);
    }

    // Check if user is still active
    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated');
    }

    return user;
  }

  async login(user: User): Promise<LoginResponse> {
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
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid token or inactive user');
    }

    return user;
  }

  async findUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async deactivateUser(id: string): Promise<void> {
    await this.userRepository.update(id, { isActive: false });
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find({
      select: ['id', 'email', 'name', 'picture', 'isActive', 'score'],
    });
  }
}
