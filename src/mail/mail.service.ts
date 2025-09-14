import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    });
  }

  async sendResetToken(email: string, token: string, firstName: string) {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/reset-password/${token}`;

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_USER'),
      to: email,
      subject: 'Password Reset',
      html: `
        <h1>Hello ${firstName},</h1>
        <p>You requested a password reset. Please click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }
  
  async sendVerificationOTP(email: string, otp: string, firstName: string) {
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_USER'),
      to: email,
      subject: 'Email Verification',
      html: `
        <h1>Hello ${firstName},</h1>
        <p>Thank you for registering with ServiceCall. Please use the following OTP to verify your email address:</p>
        <h2 style="background-color: #f2f2f2; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 5px;">${otp}</h2>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you did not create an account with us, please ignore this email.</p>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }
  
  async sendMarketingEmail(email: string, title: string, content: string, category: string) {
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_USER'),
      to: email,
      subject: title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">ServiceCall</h1>
          <h2>${title}</h2>
          <div style="margin: 20px 0;">
            ${content}
          </div>
          <hr style="margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            You're receiving this email because you're subscribed to ${category} notifications from ServiceCall.
            <br>
            To unsubscribe or manage your preferences, please contact support or update your account settings.
          </p>
          <p style="font-size: 12px; color: #666;">
            © 2025 ServiceCall. All rights reserved.
          </p>
        </div>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }
}
