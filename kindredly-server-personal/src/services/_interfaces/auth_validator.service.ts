import {CreateUserDto} from '@/dtos/users.dto';
import User from 'tset-sharedlib/schemas/public/User';

export default interface AuthValidatorService {
  validateUserCredentialsForRegistration(userData: CreateUserDto): Promise<void>;

  validateUserCredentials(userData: CreateUserDto): Promise<{user: User; verified: boolean}>;
}
