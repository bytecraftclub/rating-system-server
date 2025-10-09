import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { In, Not, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserService {
  private readonly EXCLUDED_EMAILS = [];
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}
  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  getUsersExcludingEmails(): Promise<User[]> {
    return this.userRepository.find({
      where:
        this.EXCLUDED_EMAILS.length > 0
          ? { email: Not(In(this.EXCLUDED_EMAILS)) }
          : {},
      order: {
        score: 'DESC',
        firstName: 'ASC',
      },
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['tasks'], // Load the tasks relation
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // You can now access user.tasks.length
    return user;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
