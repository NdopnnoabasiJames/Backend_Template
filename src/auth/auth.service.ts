import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, LoginDto } from 'src/user/dto/create-user.dto';
import { MailService } from 'src/mail/mail.service';
import { SmsService } from 'src/sms/sms.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
  private otpExpiryMinutes: number;
  private otpDailyLimit: number;
  private otpMinIntervalMinutes: number;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
    private smsService: SmsService,
    private configService: ConfigService,
  ) {
    this.otpExpiryMinutes = parseInt(this.configService.get('OTP_EXPIRY_MINUTES') || '10', 10);
    this.otpDailyLimit = parseInt(this.configService.get('OTP_DAILY_LIMIT') || '3', 10);
    this.otpMinIntervalMinutes = parseInt(this.configService.get('OTP_MIN_INTERVAL_MINUTES') || '5', 10);
  }

  async signUp(createUserDto: CreateUserDto) {
    const { firstName, lastName, password, email, phone, ...rest} = createUserDto;
    
    // Validate phone number format
    const phoneValidation = await this.smsService.validatePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      throw new BadRequestException(phoneValidation.error);
    }
    
    // Check for duplicate phone number
    const existingUserByPhone = await this.prisma.user.findUnique({
      where: { phone: phoneValidation.formattedNumber }
    });
    if (existingUserByPhone) {
      throw new BadRequestException('User with this phone number already exists');
    }

    // Check for duplicate email
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email }
    });
    if (existingUserByEmail) {
      throw new BadRequestException('User with this email already exists');
    }

    try {
      // Hash password and create user
      const hashedPassword = await bcrypt.hash(password, 10);
      const savedUser = await this.prisma.user.create({
        data: {
          firstName,
          lastName,
          phone: phoneValidation.formattedNumber,
          email,
          password: hashedPassword,
          isPhoneVerified: false,
          isEmailVerified: true, // Set to true since we're not using email verification
          ...rest,
        },
      });
      
      // Generate and send OTP for phone verification
      try {
        await this.generatePhoneVerificationOTP(savedUser.id);
        return {
          id: savedUser.id,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          email: savedUser.email,
          phone: savedUser.phone,
          role: savedUser.role,
          isActive: savedUser.isActive,
          isPhoneVerified: savedUser.isPhoneVerified,
          message: 'User created successfully. Please verify your phone number with the OTP sent to your phone.'
        };
      } catch (otpError) {
        // User was created but OTP sending failed
        return {
          id: savedUser.id,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          email: savedUser.email,
          phone: savedUser.phone,
          role: savedUser.role,
          isActive: savedUser.isActive,
          isPhoneVerified: savedUser.isPhoneVerified,
          message: 'User created successfully, but OTP sending failed. Please try to resend OTP.'
        };
      }
    } catch (error) {
      throw new BadRequestException('Failed to create user');
    }
  }

  async logIn(loginUserDto: LoginDto) {
    const { phone, password } = loginUserDto;

    // Find user by phone
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ForbiddenException('Your account has been deactivated');
    }

    // Check phone verification
    if (!user.isPhoneVerified) {
      throw new ForbiddenException('Please verify your phone number before logging in');
    }

    // Generate JWT token
    const payload = { 
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        isPhoneVerified: user.isPhoneVerified,
      },
    };
  }

  async generatePasswordResetOTP(phone: string): Promise<void> {
    // Find user by phone
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check rate limiting
    const now = new Date();
    if (user.lastOtpRequestTime) {
      const minutesSinceLastRequest = (now.getTime() - user.lastOtpRequestTime.getTime()) / (1000 * 60);
      if (minutesSinceLastRequest < this.otpMinIntervalMinutes) {
        const waitMinutes = Math.ceil(this.otpMinIntervalMinutes - minutesSinceLastRequest);
        throw new BadRequestException(
          `Please wait ${waitMinutes} minute(s) before requesting another OTP`
        );
      }
    }

    // Reset daily counter at midnight
    if (user.lastOtpRequestTime) {
      const lastRequestDate = new Date(user.lastOtpRequestTime);
      const today = new Date();
      if (lastRequestDate.toDateString() !== today.toDateString()) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { otpRequestCount: 0 }
        });
      }
    }

    // Check daily limit
    if (user.otpRequestCount >= this.otpDailyLimit) {
      throw new BadRequestException(
        `You have exceeded the maximum number of OTP requests (${this.otpDailyLimit}) for today`
      );
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000);

    // Update user with OTP
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordOTP: otp,
        resetPasswordOTPExpires: otpExpiry,
        lastOtpRequestTime: now,
        otpRequestCount: user.otpRequestCount + 1,
      },
    });

    // Send OTP via SMS
    try {
      await this.smsService.sendPasswordResetOTP(phone, otp, user.firstName);
    } catch (error) {
      throw new BadRequestException('Failed to send OTP. Please try again later.');
    }
  }

  async generatePhoneVerificationOTP(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isPhoneVerified) {
      throw new BadRequestException('Phone number is already verified');
    }

    // Check rate limiting
    const now = new Date();
    if (user.lastOtpRequestTime) {
      const minutesSinceLastRequest = (now.getTime() - user.lastOtpRequestTime.getTime()) / (1000 * 60);
      if (minutesSinceLastRequest < this.otpMinIntervalMinutes) {
        const waitMinutes = Math.ceil(this.otpMinIntervalMinutes - minutesSinceLastRequest);
        throw new BadRequestException(
          `Please wait ${waitMinutes} minute(s) before requesting another OTP`
        );
      }
    }

    // Reset daily counter
    if (user.lastOtpRequestTime) {
      const lastRequestDate = new Date(user.lastOtpRequestTime);
      const today = new Date();
      if (lastRequestDate.toDateString() !== today.toDateString()) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { otpRequestCount: 0 }
        });
      }
    }

    // Check daily limit
    if (user.otpRequestCount >= this.otpDailyLimit) {
      throw new BadRequestException(
        `You have exceeded the maximum number of OTP requests (${this.otpDailyLimit}) for today`
      );
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000);

    // Update user with OTP
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        phoneVerificationOTP: otp,
        phoneVerificationOTPExpires: otpExpiry,
        lastOtpRequestTime: now,
        otpRequestCount: user.otpRequestCount + 1,
      },
    });

    // Send OTP via SMS
    await this.smsService.sendPhoneVerificationOTP(user.phone, otp, user.firstName);
  }

  async verifyPhone(phone: string, otp: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isPhoneVerified) {
      throw new BadRequestException('Phone number is already verified');
    }

    if (!user.phoneVerificationOTP || !user.phoneVerificationOTPExpires) {
      throw new BadRequestException('No OTP found. Please request a new one');
    }

    // Check if OTP has expired
    if (new Date() > user.phoneVerificationOTPExpires) {
      throw new BadRequestException('OTP has expired. Please request a new one');
    }

    // Verify OTP
    if (user.phoneVerificationOTP !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    // Mark phone as verified and clear OTP
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isPhoneVerified: true,
        phoneVerificationOTP: null,
        phoneVerificationOTPExpires: null,
      },
    });
  }

  async resendVerificationOTP(phone: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isPhoneVerified) {
      throw new BadRequestException('Phone number is already verified');
    }

    await this.generatePhoneVerificationOTP(user.id);
  }

  async resetPasswordWithOTP(phone: string, otp: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.resetPasswordOTP || !user.resetPasswordOTPExpires) {
      throw new BadRequestException('No OTP found. Please request a new one');
    }

    // Check if OTP has expired
    if (new Date() > user.resetPasswordOTPExpires) {
      throw new BadRequestException('OTP has expired. Please request a new one');
    }

    // Verify OTP
    if (user.resetPasswordOTP !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear OTP
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordOTP: null,
        resetPasswordOTPExpires: null,
      },
    });
  }

  async generateResetToken(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if email exists
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpiry,
      },
    });

    await this.mailService.sendResetToken(email, resetToken, user.firstName);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });
  }

  async verifyEmail(email: string, otp: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    if (!user.emailVerificationOTP || !user.emailVerificationOTPExpires) {
      throw new BadRequestException('No OTP found. Please request a new one');
    }

    if (new Date() > user.emailVerificationOTPExpires) {
      throw new BadRequestException('OTP has expired. Please request a new one');
    }

    if (user.emailVerificationOTP !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationOTP: null,
        emailVerificationOTPExpires: null,
      },
    });
  }
}
