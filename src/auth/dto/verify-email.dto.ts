import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyPhoneDto {
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phone: string;

  @IsString({ message: 'OTP must be a string' })
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(4, 4, { message: 'OTP must be exactly 4 digits' })
  otp: string;
}

export class ResendOtpDto {
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phone: string;
}

export class ForgotPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phone: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phone: string;
  
  @IsString({ message: 'OTP must be a string' })
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(4, 4, { message: 'OTP must be exactly 4 digits' })
  otp: string;
  
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  newPassword: string;
}

// Keep old DTOs for backward compatibility
export class VerifyEmailDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString({ message: 'OTP must be a string' })
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}