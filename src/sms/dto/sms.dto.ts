import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { NotificationTiming, NotificationType } from "@prisma/client";

export class CreateSmsNotificationDto {
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsArray()
  @IsNotEmpty()
  recipients: string[];

  @IsEnum(NotificationType)
  @IsOptional()
  notificationType?: NotificationType = NotificationType.SMS;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsEnum(NotificationTiming)
  @IsOptional()
  timing?: NotificationTiming = NotificationTiming.IMMEDIATE;
}

export class SendBulkSmsDto {
  @IsArray()
  @IsNotEmpty()
  phoneNumbers: string[];

  @IsString()
  @IsNotEmpty()
  message: string;
}

export class ValidatePhoneNumberDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}
