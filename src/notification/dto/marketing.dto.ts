import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsArray, IsBoolean, IsDateString } from "class-validator";
import { MarketingCategory, NotificationTiming } from "@prisma/client";

export class CreateMarketingNotificationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(MarketingCategory)
  @IsNotEmpty()
  category: MarketingCategory;

  @IsEnum(NotificationTiming)
  @IsOptional()
  timing?: NotificationTiming = NotificationTiming.IMMEDIATE;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @IsArray()
  @IsOptional()
  recipients?: string[];

  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateMarketingPreferenceDto {
  @IsBoolean()
  @IsOptional()
  subscribedToPromotional?: boolean;

  @IsBoolean()
  @IsOptional()
  subscribedToNewsletter?: boolean;

  @IsBoolean()
  @IsOptional()
  subscribedToProductUpdates?: boolean;

  @IsBoolean()
  @IsOptional()
  subscribedToEvents?: boolean;

  @IsBoolean()
  @IsOptional()
  preferEmail?: boolean;

  @IsBoolean()
  @IsOptional()
  preferSMS?: boolean;

  @IsBoolean()
  @IsOptional()
  preferPush?: boolean;
}

export class SendMarketingEmailDto {
  @IsString()
  @IsNotEmpty()
  notificationId: string;
}
