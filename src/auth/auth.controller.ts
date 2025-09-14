import {
  Controller,
  Post,
  Body,
  BadRequestException,
  InternalServerErrorException,
  Param,
} from '@nestjs/common';

import { CreateUserDto, LoginDto } from 'src/user/dto/create-user.dto';
import { VerifyPhoneDto, ResendOtpDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto } from './dto/verify-email.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  async signUp(@Body() createUserDto: CreateUserDto) {
    try {
      const user = await this.authService.signUp(createUserDto);
      return [`user created Successfully`, user];
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error creating user:', error);
      throw new InternalServerErrorException('Error creating user');
    }
  }

  @Post('login')
  async login(@Body() loginUserDto: LoginDto) {
    return this.authService.logIn(loginUserDto);
  }
  
  @Post('verify-phone')
  async verifyPhone(@Body() verifyPhoneDto: VerifyPhoneDto) {
    await this.authService.verifyPhone(verifyPhoneDto.phone, verifyPhoneDto.otp);
    return { message: 'Phone number verified successfully' };
  }
  
  @Post('resend-verification-otp')
  async resendVerificationOTP(@Body() resendOtpDto: ResendOtpDto) {
    await this.authService.resendVerificationOTP(resendOtpDto.phone);
    return { message: 'Verification OTP sent successfully' };
  }

  // Endpoint to handle "Forgot Password" requests
  // The user provides their phone number, and a reset OTP is generated and sent via SMS.
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.authService.generatePasswordResetOTP(forgotPasswordDto.phone);
    return {
      message: 'Password reset OTP sent to your phone number.',
    };
  }

  // Endpoint to handle password reset using OTP
  // The user provides the phone number, OTP, and new password.
  @Post('reset-password')
  async resetPasswordWithOTP(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPasswordWithOTP(
      resetPasswordDto.phone,
      resetPasswordDto.otp,
      resetPasswordDto.newPassword
    );
    return { message: 'Password has been successfully reset.' };
  }

  // Keep old email-based endpoints for backward compatibility
  @Post('verify-email')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    await this.authService.verifyEmail(verifyEmailDto.email, verifyEmailDto.otp);
    return { message: 'Email verified successfully' };
  }

  @Post('forgot-password-email')
  async forgotPasswordEmail(
    @Body('email') email: string,
  ): Promise<{ message: string }> {
    await this.authService.generateResetToken(email);
    return {
      message: 'Password reset link sent to your email. Check your spam folder',
    };
  }

  @Post('reset-password/:token')
  async resetPassword(
    @Param('token') token: string,
    @Body('newPassword') newPassword: string,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(token, newPassword);
    return { message: 'Password has been successfully reset.' };
  }
}
