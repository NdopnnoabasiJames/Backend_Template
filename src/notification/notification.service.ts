import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from 'src/mail/mail.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMarketingNotificationDto, UpdateMarketingPreferenceDto } from './dto/marketing.dto';
import { NotificationTiming, MarketingCategory } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  async createMarketingNotification(createDto: CreateMarketingNotificationDto) {
    return await this.prisma.marketingNotification.create({
      data: createDto,
    });
  }

  async getUserMarketingPreference(userId: string) {
    let preference = await this.prisma.userMarketingPreference.findUnique({
      where: { userId },
    });
    
    if (!preference) {
      // Create default preference if doesn't exist
      preference = await this.prisma.userMarketingPreference.create({
        data: {
          userId,
          email: '', // Will be updated when user updates profile
          subscribedToPromotional: true,
          subscribedToNewsletter: true,
          subscribedToProductUpdates: true,
          subscribedToEvents: true,
        },
      });
    }
    
    return preference;
  }

  async updateMarketingPreference(
    userId: string, 
    email: string,
    updateDto: UpdateMarketingPreferenceDto
  ) {
    const existing = await this.prisma.userMarketingPreference.findUnique({
      where: { userId },
    });
    
    if (!existing) {
      return await this.prisma.userMarketingPreference.create({
        data: {
          userId,
          email,
          subscribedToPromotional: updateDto.subscribedToPromotional ?? true,
          subscribedToNewsletter: updateDto.subscribedToNewsletter ?? true,
          subscribedToProductUpdates: updateDto.subscribedToProductUpdates ?? true,
          subscribedToEvents: updateDto.subscribedToEvents ?? true,
          preferEmail: updateDto.preferEmail ?? true,
          preferSMS: updateDto.preferSMS ?? false,
          preferPush: updateDto.preferPush ?? false,
        },
      });
    }
    
    return await this.prisma.userMarketingPreference.update({
      where: { userId },
      data: {
        email,
        ...updateDto,
      },
    });
  }

  async sendMarketingNotification(notificationId: string): Promise<{ success: boolean; message: string; stats?: any }> {
    const notification = await this.prisma.marketingNotification.findUnique({
      where: { id: notificationId },
    });
    
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

    // Build the where clause based on category
    const categoryField = this.getCategorySubscriptionField(notification.category);
    
    // Get opted-in users for this category
    const optedInUsers = await this.prisma.userMarketingPreference.findMany({
      where: {
        [categoryField]: true,
        preferEmail: true, // Only send to users who prefer email
      },
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
          notification.category,
        );
        successCount++;
      } catch (error) {
        failureCount++;
        console.error(`Failed to send marketing email to ${user.email}:`, error.message);
      }
    }

    // Update notification status
    await this.prisma.marketingNotification.update({
      where: { id: notificationId },
      data: {
        sent: true,
        sentAt: new Date(),
        successCount,
        failureCount,
      },
    });

    return {
      success: true,
      message: `Marketing notification sent successfully`,
      stats: {
        totalRecipients: optedInUsers.length,
        successCount,
        failureCount,
      },
    };
  }

  async scheduleMarketingNotification(id: string, scheduledDate: Date) {
    const notification = await this.prisma.marketingNotification.findUnique({
      where: { id },
    });
    
    if (!notification) {
      throw new NotFoundException('Marketing notification not found');
    }

    return await this.prisma.marketingNotification.update({
      where: { id },
      data: {
        timing: NotificationTiming.SCHEDULED,
        scheduledDate,
      },
    });
  }

  async getMarketingNotifications(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const [notifications, total] = await Promise.all([
      this.prisma.marketingNotification.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.marketingNotification.count(),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMarketingNotificationById(id: string) {
    const notification = await this.prisma.marketingNotification.findUnique({
      where: { id },
    });
    
    if (!notification) {
      throw new NotFoundException('Marketing notification not found');
    }
    
    return notification;
  }

  /**
   * Helper to map category enum to database field
   */
  private getCategorySubscriptionField(category: MarketingCategory): string {
    switch (category) {
      case MarketingCategory.PROMOTIONAL:
        return 'subscribedToPromotional';
      case MarketingCategory.NEWSLETTER:
        return 'subscribedToNewsletter';
      case MarketingCategory.PRODUCT_UPDATES:
        return 'subscribedToProductUpdates';
      case MarketingCategory.EVENTS:
        return 'subscribedToEvents';
      default:
        return 'subscribedToPromotional';
    }
  }
}
