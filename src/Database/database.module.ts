import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [MongooseModule.forRootAsync({
    imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('DATABASE_URI'),
      }),
      inject: [ConfigService],
  })],
})
export class DatabaseModule {}
