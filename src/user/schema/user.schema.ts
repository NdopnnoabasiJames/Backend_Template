import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { UserRole } from '../enums/role.enum';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, unique: true })
  phone: string;

  @Prop({ required: true, default: UserRole.USER })
  role: UserRole;

  @Prop({ required: true, default: true })
  isActive?: boolean;

  @Prop({ default: false })
  isPhoneVerified: boolean;

  @Prop()
  phoneVerificationOTP?: string;

  @Prop()
  phoneVerificationOTPExpires?: Date;

  @Prop({ default: 0 })
  otpRequestCount: number;

  @Prop()
  lastOtpRequestTime?: Date;

  @Prop()
  resetPasswordOTP?: string;

  @Prop()
  resetPasswordOTPExpires?: Date;

  // Keep email verification fields for backward compatibility
  @Prop({ default: true }) // Default to true since we're not using email verification anymore
  isEmailVerified: boolean;

  @Prop()
  emailVerificationOTP?: string;

  @Prop()
  emailVerificationOTPExpires?: Date;

  @Prop()
  resetPasswordToken?: string;

  @Prop()
  resetPasswordExpires?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

