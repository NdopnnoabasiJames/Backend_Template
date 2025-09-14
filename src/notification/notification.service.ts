import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { MailService } from 'src/mail/mail.service';
import { MarketingNotification, UserMarketingPreference } from './schemas/marketing.schema';
import { CreateMarketingNotificationDto, UpdateMarketingPreferenceDto } from './dto/marketing.dto';
import { NotificationTiming, MarketingCategory } from 'src/schemas/notification.schema';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(MarketingNotification.name) private notificationModel: Model<MarketingNotification>,
    @InjectModel(UserMarketingPreference.name) private preferenceModel: Model<UserMarketingPreference>,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  async createMarketingNotification(createDto: CreateMarketingNotificationDto): Promise<MarketingNotification> {
    const notification = new this.notificationModel(createDto);
    return await notification.save();
  }

  async getUserMarketingPreference(userId: string): Promise<UserMarketingPreference> {
    let preference = await this.preferenceModel.findOne({ userId });
    
    if (!preference) {
      // Create default preference if doesn't exist
      preference = new this.preferenceModel({
        userId,
        email: '', // Will be updated when user updates profile
        optedIn: true,
        subscribedCategories: [MarketingCategory.PROMOTIONAL]
      });
      await preference.save();
    }
    
    return preference;
  }

  async updateMarketingPreference(
    userId: string, 
    email: string,
    updateDto: UpdateMarketingPreferenceDto
  ): Promise<UserMarketingPreference> {
    let preference = await this.preferenceModel.findOne({ userId });
    
    if (!preference) {
      preference = new this.preferenceModel({
        userId,
        email,
        optedIn: updateDto.optedIn ?? true,
        subscribedCategories: updateDto.subscribedCategories ?? [MarketingCategory.PROMOTIONAL]
      });
    } else {
      if (updateDto.optedIn !== undefined) {
        preference.optedIn = updateDto.optedIn;
        if (!updateDto.optedIn) {
          preference.optOutDate = new Date();
        }
      }
      if (updateDto.subscribedCategories) {
        preference.subscribedCategories = updateDto.subscribedCategories;
      }
      preference.email = email; // Update email in case it changed
    }
    
    return await preference.save();
  }

  async sendMarketingNotification(notificationId: string): Promise<{ success: boolean; message: string; stats?: any }> {
    const notification = await this.notificationModel.findById(notificationId);
    if (!notification) {
      throw new NotFoundException('Marketing notification not found');
    }

    if (notification.sent) {
      throw new BadRequestException('Notification has already been sent');
    }

    if (notification.timing === NotificationTiming.SCHEDULED && 
        notification.scheduledDate && 
        new Date() < notification.scheduledDate) {
      throw new BadRequestException('Scheduled notification time has not arrived yet');
    }

    // Get opted-in users for this category
    const optedInUsers = await this.preferenceModel.find({
      optedIn: true,
      subscribedCategories: { $in: [notification.category] }
    });

    let successCount = 0;
    let failureCount = 0;

    // Send emails to opted-in users
    for (const user of optedInUsers) {
      try {
        await this.mailService.sendMarketingEmail(
          user.email,
          notification.title,
          notification.content,
          notification.category
        );
        successCount++;
        
        // Update last email sent
        user.lastEmailSent = new Date();
        await user.save();
      } catch (error) {
        failureCount++;
        console.error(`Failed to send marketing email to ${user.email}:`, error.message);
      }
    }

    // Update notification status
    notification.sent = true;
    notification.sentAt = new Date();
    notification.successCount = successCount;
    notification.failureCount = failureCount;
    await notification.save();

    return {
      success: true,
      message: `Marketing notification sent successfully`,
      stats: {
        totalRecipients: optedInUsers.length,
        successful: successCount,
        failed: failureCount
      }
    };
  }

  async getMarketingNotifications(limit: number = 10, skip: number = 0): Promise<MarketingNotification[]> {
    return await this.notificationModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  async scheduleMarketingNotification(notificationId: string, scheduledDate: Date): Promise<MarketingNotification> {
    const notification = await this.notificationModel.findById(notificationId);
    if (!notification) {
      throw new NotFoundException('Marketing notification not found');
    }

    notification.timing = NotificationTiming.SCHEDULED;
    notification.scheduledDate = scheduledDate;
    
    return await notification.save();
  }
}
