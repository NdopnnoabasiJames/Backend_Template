import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private termiiApiKey: string;
  private termiiSenderId: string;
  private termiiBaseUrl = 'https://api.ng.termii.com/api/sms/send';

  constructor(private configService: ConfigService) {
    this.initializeTermii();
  }

  private initializeTermii() {
    try {
      this.termiiApiKey = this.configService.get<string>('TERMII_API_KEY');
      this.termiiSenderId = this.configService.get<string>('TERMII_SENDER_ID') || 'N-Alert';
      
      if (!this.termiiApiKey) {
        this.logger.warn('Termii API key not configured. SMS functionality will be disabled.');
        return;
      }

      this.logger.log('Termii SMS service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Termii SMS service:', error.message);
    }
  }

  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.termiiApiKey) {
      this.logger.error('Termii API key not configured. Cannot send SMS.');
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      // Clean and format phone number
      const cleanPhoneNumber = this.formatPhoneNumber(to);
      
      this.logger.log(`Sending SMS via Termii to ${cleanPhoneNumber}: ${message.substring(0, 50)}...`);
      
      const payload = {
        to: cleanPhoneNumber,
        from: this.termiiSenderId,
        sms: message,
        type: 'plain',
        channel: 'generic',
        api_key: this.termiiApiKey
      };

      const response = await fetch(this.termiiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.code === 'ok') {
        this.logger.log(`SMS sent successfully to ${cleanPhoneNumber}. Message ID: ${result.message_id}`);
        return { success: true, messageId: result.message_id };
      } else {
        throw new Error(result.message || 'Failed to send SMS via Termii');
      }
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async sendBulkSMS(recipients: string[], message: string): Promise<{
    totalSent: number;
    successful: string[];
    failed: Array<{ phoneNumber: string; error: string }>;
  }> {
    const results = {
      totalSent: 0,
      successful: [],
      failed: []
    };

    for (const phoneNumber of recipients) {
      try {
        const result = await this.sendSMS(phoneNumber, message);
        
        if (result.success) {
          results.successful.push(phoneNumber);
          results.totalSent++;
        } else {
          results.failed.push({ phoneNumber, error: result.error });
        }
      } catch (error) {
        results.failed.push({ phoneNumber, error: error.message });
      }
    }

    this.logger.log(`Bulk SMS completed: ${results.totalSent} successful, ${results.failed.length} failed`);
    return results;
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // If it already starts with +234, use as is
    if (cleaned.startsWith('+234')) {
      return cleaned;
    }
    
    // If it starts with 234 (without +), add the +
    if (cleaned.startsWith('234') && cleaned.length === 13) {
      return '+' + cleaned;
    }
    
    // If it starts with 0, replace with +234
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return '+234' + cleaned.substring(1);
    }
    
    // If it's 10 digits (without 0 or country code), add +234
    if (cleaned.length === 10 && !cleaned.startsWith('0')) {
      return '+234' + cleaned;
    }
    
    // If none of the above patterns match, assume it needs +234
    return '+234' + cleaned;
  }

  async validatePhoneNumber(phoneNumber: string): Promise<{ isValid: boolean; formattedNumber?: string; error?: string }> {
    try {
      const formatted = this.formatPhoneNumber(phoneNumber);
      
      // Nigerian phone number validation - simplified
      // Format: +234XXXXXXXXXX (total 14 characters including +234)
      // Only check format and length, not network prefixes
      const nigerianPhoneRegex = /^\+234[0-9]{10}$/;
      
      if (!nigerianPhoneRegex.test(formatted)) {
        return { isValid: false, error: 'Invalid Nigerian phone number format. Should be 11 digits starting with 0 or include +234 country code.' };
      }
      
      return { isValid: true, formattedNumber: formatted };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  }

  isConfigured(): boolean {
    return !!this.termiiApiKey;
  }

  async sendPhoneVerificationOTP(phoneNumber: string, otp: string, firstName: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `Hello ${firstName}, your ServiceCall phone verification code is: ${otp}. Valid for 10 minutes. Do not share this OTP with anyone. Thanks for using ServiceCall!`;
    return this.sendSMS(phoneNumber, message);
  }

  async sendPasswordResetOTP(phoneNumber: string, otp: string, firstName: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `Hello ${firstName}, your ServiceCall password reset code is: ${otp}. Valid for 10 minutes. Do not share this OTP with anyone. Thanks for using ServiceCall!`;
    return this.sendSMS(phoneNumber, message);
  }
}
