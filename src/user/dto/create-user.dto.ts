import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength, IsOptional } from "class-validator";
import { UserRole } from "../enums/role.enum";

export class CreateUserDto {
    
  @IsString()
  @MinLength(3)
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @MinLength(3)
  @IsNotEmpty()
  lastName: string;

  @IsEmail({}, {message: 'Please enter a valid email'})
  @IsNotEmpty({message: 'Email is required'})
  email: string;

  @IsNotEmpty({message: 'Password is required'})
  @MinLength(6, {message: 'Password must be at least 6 characters'})
  password: string;

  @IsNotEmpty({message: 'Phone number is required'})
  @IsString()
  phone: string;

  @IsNotEmpty({message: 'Role is required'})
  @IsEnum(UserRole, {message: 'Role is invalid'})
  role: UserRole;

  @IsOptional()
  isActive?: boolean;

}

export class LoginDto {

    @IsNotEmpty({message: 'Phone number is required'})
    @IsString()
    phone: string;

    @IsNotEmpty({message: 'Password is required'})
    @MinLength(6, {message: 'Password must be at least 6 characters'})
    password: string;

}