import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { User } from 'src/user/schema/user.schema';
import { CreateUserDto, LoginDto } from 'src/user/dto/create-user.dto';
import { MailService } from 'src/mail/mail.service';
import { SmsService } from 'src/sms/sms.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    private mailService: MailService,
    private smsService: SmsService,
  ) {}

  async signUp(createUserDto: CreateUserDto) {
    const { firstName, lastName, password, email, phone, ...rest} = createUserDto;
    
    // Validate phone number format
    const phoneValidation = await this.smsService.validatePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      throw new BadRequestException(phoneValidation.error);
    }
    
    // Check for duplicate phone number
    const existingUserByPhone = await this.userModel.findOne({ phone: phoneValidation.formattedNumber });
    if (existingUserByPhone) {
      throw new BadRequestException('User with this phone number already exists');
    }

    // Check for duplicate email
    const existingUserByEmail = await this.userModel.findOne({ email: email });
    if (existingUserByEmail) {
      throw new BadRequestException('User with this email already exists');
    }

    try {
      // Hash password and create user
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new this.userModel({
        firstName,
        lastName,
        phone: phoneValidation.formattedNumber,
        email,
        password: hashedPassword,
        isPhoneVerified: false,
        isEmailVerified: true, // Set to true since we're not using email verification
        ...rest,
      });
      
      const savedUser = await newUser.save();
      
      // Generate and send OTP for phone verification
      try {
        await this.generatePhoneVerificationOTP(savedUser._id.toString());
        return {
          _id: savedUser._id,
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
          _id: savedUser._id,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          email: savedUser.email,
          phone: savedUser.phone,
          role: savedUser.role,
          isActive: savedUser.isActive,
          isPhoneVerified: savedUser.isPhoneVerified,
          message: 'User created successfully, but failed to send verification SMS. Please use the resend OTP feature.',
          smsError: true
        };
      }
    } catch (mongoError) {
      // Handle MongoDB duplicate key errors that might slip through
      if (mongoError.code === 11000) {
        if (mongoError.keyPattern?.email) {
          throw new BadRequestException('User with this email already exists');
        }
        if (mongoError.keyPattern?.phone) {
          throw new BadRequestException('User with this phone number already exists');
        }
        throw new BadRequestException('User with these details already exists');
      }
      // Re-throw other MongoDB errors
      throw mongoError;
    }
  }

  async logIn(loginUserDto: LoginDto) {
    const { phone, password } = loginUserDto;
    
    // Validate and format phone number
    const phoneValidation = await this.smsService.validatePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      throw new BadRequestException(phoneValidation.error);
    }
    
    const user = await this.userModel.findOne({ phone: phoneValidation.formattedNumber });
    
    // Check if user exists and password is correct
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    // Check if phone is verified
    if (!user.isPhoneVerified) {
      throw new ForbiddenException('Phone number not verified. Please verify your phone number before logging in.');
    }
    
    const payload = { id: user._id, role: user.role, phone: user.phone, email: user.email };

    const accessToken = await this.jwtService.sign(payload);

    return {
      message: `${user.firstName} ${user.lastName} is logged in successfully`,
      access_token: accessToken,
    };  
  }

  //Logic to generate the reset OTP for forgotten password
  async generatePasswordResetOTP(phone: string): Promise<void> {
    if (!phone) throw new BadRequestException('No phone number provided');
    
    // Validate phone number format
    const phoneValidation = await this.smsService.validatePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      throw new BadRequestException(phoneValidation.error);
    }
    
    // Check if the user exists
    const user = await this.userModel.findOne({ phone: phoneValidation.formattedNumber });
    if (!user) {
      throw new BadRequestException('User with this phone number does not exist');
    }

    // Check if user has exceeded daily OTP request limit (3 times per day)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Reset OTP request count if it's a new day
    if (user.lastOtpRequestTime && user.lastOtpRequestTime < today) {
      user.otpRequestCount = 0;
    }
    
    // Check if user has exceeded daily limit
    if (user.otpRequestCount >= 3) {
      throw new ConflictException('You have exceeded the maximum number of OTP requests for today. Please try again tomorrow.');
    }
    
    // Check if user is requesting too frequently (5-minute interval)
    if (user.lastOtpRequestTime) {
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      if (user.lastOtpRequestTime > fiveMinutesAgo) {
        throw new ConflictException('Please wait at least 5 minutes before requesting a new OTP.');
      }
    }

    // Generate a 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    try {
      // Send OTP to user's phone first
      await this.smsService.sendPasswordResetOTP(phoneValidation.formattedNumber, otp, user.firstName);
      
      // Only save OTP to database if SMS was sent successfully
      user.resetPasswordOTP = otp;
      user.resetPasswordOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      user.otpRequestCount += 1;
      user.lastOtpRequestTime = now;
      
      await user.save();
    } catch (smsError) {
      // If SMS sending fails, still save the OTP but log the error
      console.error('Failed to send password reset SMS:', smsError.message);
      
      // Save OTP anyway so user can potentially verify later
      user.resetPasswordOTP = otp;
      user.resetPasswordOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
      user.otpRequestCount += 1;
      user.lastOtpRequestTime = now;
      
      await user.save();
      
      // Re-throw the error to be handled by the calling function
      throw new BadRequestException('Failed to send password reset SMS. Please try again.');
    }
  }

  // Generate a 4-digit OTP for phone verification
  async generatePhoneVerificationOTP(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    
    // Check if user has already verified their phone
    if (user.isPhoneVerified) {
      throw new BadRequestException('Phone number already verified');
    }
    
    // Check if user has exceeded daily OTP request limit (3 times per day)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Reset OTP request count if it's a new day
    if (user.lastOtpRequestTime && user.lastOtpRequestTime < today) {
      user.otpRequestCount = 0;
    }
    
    // Check if user has exceeded daily limit
    if (user.otpRequestCount >= 3) {
      throw new ConflictException('You have exceeded the maximum number of OTP requests for today. Please try again tomorrow.');
    }
    
    // Check if user is requesting too frequently (5-minute interval)
    if (user.lastOtpRequestTime) {
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      if (user.lastOtpRequestTime > fiveMinutesAgo) {
        throw new ConflictException('Please wait at least 5 minutes before requesting a new OTP.');
      }
    }
    
    // Generate a 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    
    try {
      // Send OTP to user's phone first
      await this.smsService.sendPhoneVerificationOTP(user.phone, otp, user.firstName);
      
      // Only save OTP to database if SMS was sent successfully
      user.phoneVerificationOTP = otp;
      user.phoneVerificationOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
      user.otpRequestCount += 1;
      user.lastOtpRequestTime = now;
      
      await user.save();
    } catch (smsError) {
      // If SMS sending fails, still save the OTP but log the error
      console.error('Failed to send verification SMS:', smsError.message);
      
      // Save OTP anyway so user can potentially verify later
      user.phoneVerificationOTP = otp;
      user.phoneVerificationOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
      user.otpRequestCount += 1;
      user.lastOtpRequestTime = now;
      
      await user.save();
      
      // Re-throw the error to be handled by the calling function
      throw new BadRequestException('User created but failed to send verification SMS. Please try resending OTP.');
    }
  }
  
  // Verify phone with OTP
  async verifyPhone(phone: string, otp: string): Promise<void> {
    if (!phone || !otp) {
      throw new BadRequestException('Phone number and OTP are required');
    }
    
    // Validate phone number format
    const phoneValidation = await this.smsService.validatePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      throw new BadRequestException(phoneValidation.error);
    }
    
    const user = await this.userModel.findOne({ phone: phoneValidation.formattedNumber });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    
    // Check if phone is already verified
    if (user.isPhoneVerified) {
      throw new BadRequestException('Phone number already verified');
    }
    
    // Check if OTP is valid and not expired
    if (!user.phoneVerificationOTP || user.phoneVerificationOTP !== otp) {
      throw new BadRequestException('Invalid OTP');
    }
    
    if (!user.phoneVerificationOTPExpires || user.phoneVerificationOTPExpires < new Date()) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }
    
    // Mark phone as verified and clear OTP fields
    user.isPhoneVerified = true;
    user.phoneVerificationOTP = null;
    user.phoneVerificationOTPExpires = null;
    
    await user.save();
  }
  
  // Resend OTP for phone verification
  async resendVerificationOTP(phone: string): Promise<void> {
    if (!phone) {
      throw new BadRequestException('Phone number is required');
    }
    
    // Validate phone number format
    const phoneValidation = await this.smsService.validatePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      throw new BadRequestException(phoneValidation.error);
    }
    
    const user = await this.userModel.findOne({ phone: phoneValidation.formattedNumber });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    
    // Check if phone is already verified
    if (user.isPhoneVerified) {
      throw new BadRequestException('Phone number already verified');
    }
    
    // Generate new OTP
    await this.generatePhoneVerificationOTP(user._id.toString());
  }
  
  //Logic to reset password with OTP
  async resetPasswordWithOTP(phone: string, otp: string, newPassword: string): Promise<void> {
    if (!phone || !otp || !newPassword) {
      throw new BadRequestException('Phone number, OTP, and new password are required');
    }
    
    // Validate phone number format
    const phoneValidation = await this.smsService.validatePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      throw new BadRequestException(phoneValidation.error);
    }
    
    // Find user by phone and ensure OTP is valid and not expired
    const user = await this.userModel.findOne({
      phone: phoneValidation.formattedNumber,
      resetPasswordOTP: otp,
      resetPasswordOTPExpires: { $gt: new Date() }, // Ensure the OTP is not expired
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset OTP');
    }

    const saltRounds = 10;
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = hashedPassword; //Assign the hashedpassword to the users password
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;

    await user.save();
  }

  // Keep old email-based methods for backward compatibility if needed
  async generateResetToken(email: string): Promise<void> {
    if (!email) throw new BadRequestException('No email provided');
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new BadRequestException('User with this email does not exist');
    }

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    await this.mailService.sendResetToken(email, token, user.firstName);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (!token || !newPassword) {
      throw new BadRequestException('Token or password not provided');
    }
    const user = await this.userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
  }

  // Keep old email verification methods for backward compatibility
  async verifyEmail(email: string, otp: string): Promise<void> {
    if (!email || !otp) {
      throw new BadRequestException('Email and OTP are required');
    }
    
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    
    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }
    
    if (!user.emailVerificationOTP || user.emailVerificationOTP !== otp) {
      throw new BadRequestException('Invalid OTP');
    }
    
    if (!user.emailVerificationOTPExpires || user.emailVerificationOTPExpires < new Date()) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }
    
    user.isEmailVerified = true;
    user.emailVerificationOTP = null;
    user.emailVerificationOTPExpires = null;
    
    await user.save();
  }
}
