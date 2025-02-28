import { CreateUserDto } from "@dtos/users.dto";
import { HttpException } from "@exceptions/HttpException";
import {
  LoginType
} from "tset-sharedlib/shared.types";
import UserService from "../user.service";

import { checkPassword } from "@/utils/auth_utils";
import {
  checkEmail,
  checkUserName
} from '@/utils/user.utils';

import AuthValidatorService from "../_interfaces/auth_validator.service";
import { hashString, secureCompareSecrets } from "@/utils/crypto_util";
import { UserRepo } from "@/db/user.repo";
import User from "@/schemas/public/User";



class OpenAuthValidatorService implements AuthValidatorService {

  private userService = new UserService();
  private users = new UserRepo();


  
   async validateUserCredentialsForRegistration(userData: CreateUserDto) {
    if (userData.loginType == LoginType.internal) {
      if (!userData.username) {
        throw new HttpException(400, "Username is required");
      }
      userData.username = userData.username.toLowerCase();
      checkUserName(userData.username);
      checkEmail(userData.email);
      checkPassword(userData.password);
      await this.userService._checkUsernameExists(userData.username);
    }  else {
      throw new Error("Invalid login type:" + userData.loginType);
    }
  }

   async validateUserCredentials(userData: CreateUserDto): Promise<{user: User, verified: boolean}>
    {
    let user: User = null;
    let verified = false;
      if (userData.loginType == LoginType.internal) {
        if (!userData.password)
          throw new HttpException(400, "Password is missing");
  
        user = await this.users.findByUsername(
          userData.username.toLowerCase()
        );
        if (!user) {
          user = await this.users.findByEmail(
            userData.email || userData.username
          );
        }
  
        if (!user) {
          throw new HttpException(409, `Login failed`);
        }
  
        const hashedPassword = hashString(userData.password);
        const isPasswordMatching: boolean = secureCompareSecrets(hashedPassword, user.password);
        if (!isPasswordMatching)
          throw new HttpException(409, "Password is not matching");
        else {
          verified = true;
        }
      
      } else {
        throw new HttpException(400, "Invalid login type");
      }
      return {user: user, verified };
    }
  

}

export default OpenAuthValidatorService;
