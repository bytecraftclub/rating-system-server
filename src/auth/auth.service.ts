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

  async findOrCreateUser(googleUser): Promise<User> {
    // 1. Try to find a user by their Google ID
    let user = await this.userRepository.findOneBy({ googleId: googleUser.id });

    if (user) {
      // If found, update any relevant details that might have changed on Google's side
      user.email = googleUser.email;
      user.firstName = googleUser.firstName;
      user.lastName = googleUser.lastName;
      user.avatar = googleUser.picture;
      await this.userRepository.save(user);
      return user;
    }

    // 2. If not found by Google ID, try to find by email (optional but useful)
    user = await this.userRepository.findOneBy({ email: googleUser.email });
    if (user) {
      // This means a user with this email already exists (e.g., signed up with email/password).
      // You can link the accounts by adding the GoogleId to the existing user.
      user.googleId = googleUser.id;
      await this.userRepository.save(user);
      return user;
    }
    const refresh_token = this.jwtService.sign(
      { email: googleUser.email, sub: googleUser.id },
      { expiresIn: '30d' },
    );
    // 3. If no user exists at all, create a new one
    const newUser = this.userRepository.create({
      email: googleUser.email,
      firstName: googleUser.firstName,
      lastName: googleUser.lastName,
      avatar: googleUser.picture,
      googleId: googleUser.id,
      refreshtoken: refresh_token,
    });

    await this.userRepository.save(newUser);
    return newUser;
  }

  async login(user: User) {
    // This remains the same, now acting on your DB User entity
    const payload = { email: user.email, sub: user.googleId };
    return {
      access_token: this.jwtService.sign(payload),
      refreshtoken: user.refreshtoken,
      user: { id: user.googleId, email: user.email, name: user.firstName }, // Sanitize user object for client
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
      const splitName = (displayName: string) => {
        const names = displayName.split(' ');
        const firstName = names[0];
        const lastName = names.length > 1 ? names.slice(1).join(' ') : '';
        return { firstName, lastName };
      };

      // In your create method
      const { firstName, lastName } = splitName(displayName);

      user = this.userRepository.create({
        googleId: id,
        email,
        firstName,
        lastName,
        avatar: photos[0]?.value, // Keep as avatar
        isActive: true,
        score: 0,
      });
      user = await this.userRepository.save(user);
    } else {
      // Update existing user info (in case profile changed)
      user.firstName = displayName;
      user.avatar = photos[0]?.value;
      user = await this.userRepository.save(user);
    }

    // Check if user is still active
    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated');
    }

    return user;
  }
}
