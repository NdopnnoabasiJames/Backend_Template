import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateMarketingNotificationDto, UpdateMarketingPreferenceDto, SendMarketingEmailDto } from './dto/marketing.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/user/enums/role.enum';

@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Post('marketing')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTISAN) // Assuming artisans can create marketing notifications
  async createMarketingNotification(@Body() createDto: CreateMarketingNotificationDto) {
    return this.notificationService.createMarketingNotification(createDto);
  }

  @Get('marketing')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTISAN)
  async getMarketingNotifications(
    @Query('limit') limit: string = '10',
    @Query('skip') skip: string = '0'
  ) {
    return this.notificationService.getMarketingNotifications(
      parseInt(limit),
      parseInt(skip)
    );
  }

  @Post('marketing/:id/send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTISAN)
  async sendMarketingNotification(@Param('id') id: string) {
    return this.notificationService.sendMarketingNotification(id);
  }

  @Put('marketing/:id/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTISAN)
  async scheduleMarketingNotification(
    @Param('id') id: string,
    @Body('scheduledDate') scheduledDate: string
  ) {
    return this.notificationService.scheduleMarketingNotification(
      id,
      new Date(scheduledDate)
    );
  }

  @Get('preferences/:userId')
  @UseGuards(JwtAuthGuard)
  async getUserMarketingPreference(@Param('userId') userId: string) {
    return this.notificationService.getUserMarketingPreference(userId);
  }

  @Put('preferences/:userId')
  @UseGuards(JwtAuthGuard)
  async updateMarketingPreference(
    @Param('userId') userId: string,
    @Body('email') email: string,
    @Body() updateDto: UpdateMarketingPreferenceDto
  ) {
    return this.notificationService.updateMarketingPreference(userId, email, updateDto);
  }
}
