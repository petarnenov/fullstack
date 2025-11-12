import { User, CreateUserRequest } from '../../schemas/user';

export interface IUserRepository {
  findAll(): User[];
  findById(id: string): User | undefined;
  create(data: CreateUserRequest): User;
  update(id: string, data: Partial<User>): User | undefined;
  delete(id: string): boolean;
}
