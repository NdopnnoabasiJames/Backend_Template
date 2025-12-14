import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private termiiApiKey: string;
  private termiiSenderId: string;
  private termiiBaseUrl = 'https://api.ng.termii.com/api/sms/send';
  private smsCountryCode: string;
  private phoneRegex: RegExp;

  constructor(private configService: ConfigService) {
    this.initializeTermii();
    this.initializePhoneConfig();
  }

  private initializePhoneConfig() {
    // Get country code from config, default to Nigeria
    this.smsCountryCode = this.configService.get<string>('SMS_COUNTRY_CODE') || '+234';
    
    // Get phone regex pattern from config
    const regexPattern = this.configService.get<string>('SMS_PHONE_REGEX');
    if (regexPattern) {
      try {
        this.phoneRegex = new RegExp(regexPattern);
      } catch (error) {
        this.logger.warn(`Invalid SMS_PHONE_REGEX pattern. Using default for ${this.smsCountryCode}`);
        this.phoneRegex = this.getDefaultRegex(this.smsCountryCode);
      }
    } else {
      this.phoneRegex = this.getDefaultRegex(this.smsCountryCode);
    }
  }

  private getDefaultRegex(countryCode: string): RegExp {
    // Default regex patterns for common countries
    const patterns = {
      '+234': /^\+234[0-9]{10}$/, // Nigeria: +234XXXXXXXXXX
      '+1': /^\+1[0-9]{10}$/, // USA/Canada: +1XXXXXXXXXX
      '+44': /^\+44[0-9]{10}$/, // UK: +44XXXXXXXXXX
      '+91': /^\+91[0-9]{10}$/, // India: +91XXXXXXXXXX
    };
    return patterns[countryCode] || /^\+[0-9]{1,3}[0-9]{7,14}$/; // Generic international
  }

  private initializeTermii() {
    try {
      this.termiiApiKey = this.configService.get<string>('TERMII_API_KEY');
      this.termiiSenderId = this.configService.get<string>('TERMII_SENDER_ID') || 'AppNotify';
      
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
    
    // If it already starts with the configured country code, use as is
    if (cleaned.startsWith(this.smsCountryCode)) {
      return cleaned;
    }
    
    // Extract just the country code digits (without +)
    const countryCodeDigits = this.smsCountryCode.substring(1);
    
    // If it starts with country code digits (without +), add the +
    if (cleaned.startsWith(countryCodeDigits) && cleaned.length > countryCodeDigits.length) {
      return '+' + cleaned;
    }
    
    // For Nigeria: If it starts with 0, replace with country code
    if (this.smsCountryCode === '+234' && cleaned.startsWith('0') && cleaned.length === 11) {
      return this.smsCountryCode + cleaned.substring(1);
    }
    
    // For USA/Canada: If it's 10 digits, add country code
    if (this.smsCountryCode === '+1' && cleaned.length === 10) {
      return this.smsCountryCode + cleaned;
    }
    
    // Generic: If none of the above patterns match, prepend country code
    return this.smsCountryCode + cleaned.replace(/^0+/, '');
  }

  async validatePhoneNumber(phoneNumber: string): Promise<{ isValid: boolean; formattedNumber?: string; error?: string }> {
    try {
      const formatted = this.formatPhoneNumber(phoneNumber);
      
      // Validate against configured regex pattern
      if (!this.phoneRegex.test(formatted)) {
        const countryName = this.getCountryName(this.smsCountryCode);
        return { 
          isValid: false, 
          error: `Invalid phone number format for ${countryName}. Expected format: ${this.smsCountryCode}XXXXXXXXXX` 
        };
      }
      
      return { isValid: true, formattedNumber: formatted };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  }

  private getCountryName(countryCode: string): string {
    const countries = {
      '+234': 'Nigeria',
      '+1': 'USA/Canada',
      '+44': 'UK',
      '+91': 'India',
    };
    return countries[countryCode] || 'configured country';
  }

  isConfigured(): boolean {
    return !!this.termiiApiKey;
  }

  async sendPhoneVerificationOTP(phoneNumber: string, otp: string, firstName: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const appName = this.configService.get<string>('APP_NAME') || 'NestJS Auth Starter';
    const message = `Hello ${firstName}, your ${appName} phone verification code is: ${otp}. Valid for 10 minutes. Do not share this OTP with anyone.`;
    return this.sendSMS(phoneNumber, message);
  }

  async sendPasswordResetOTP(phoneNumber: string, otp: string, firstName: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const appName = this.configService.get<string>('APP_NAME') || 'NestJS Auth Starter';
    const message = `Hello ${firstName}, your ${appName} password reset code is: ${otp}. Valid for 10 minutes. Do not share this OTP with anyone.`;
    return this.sendSMS(phoneNumber, message);
  }
}
