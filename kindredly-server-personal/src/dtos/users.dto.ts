import {IsEmail, IsObject, IsOptional, IsString} from 'class-validator';
import { LoginType, UserType } from 'tset-sharedlib/shared.types';

export class CreateUserDto {
  @IsOptional()
  public username: string;

  @IsOptional()
  @IsEmail()
  public email?: string;

  @IsOptional()
  public displayedName?: string;

  @IsOptional()
  @IsObject()
  public refData?: Record<string, any>;

  @IsOptional()
  public password: string;

  @IsOptional()
  public serverCopyOfPassword?: string;

  @IsOptional()
  @IsString()
  public loginType: LoginType;

  @IsOptional()
  @IsString()
  public loginId?: string;

  @IsOptional()
  @IsObject()
  public loginPayload?: Record<string, any>;

  @IsOptional()
  @IsObject()
  public additionalInfo?: Record<string, any>;

  @IsOptional()
  @IsObject()
  public inviteVerification?: Record<string, any>;

  @IsOptional()
  @IsObject()
  public otherSettings?: Record<string, any>;

  @IsOptional()
  @IsString()
  public type?: UserType

  @IsOptional()
  @IsString()
  public recaptchaToken?: string;

  @IsOptional()
  @IsObject()
  public clientInfoData?: Record<string, any>;
}
