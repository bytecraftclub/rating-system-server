import { Injectable } from '@nestjs/common';
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

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
