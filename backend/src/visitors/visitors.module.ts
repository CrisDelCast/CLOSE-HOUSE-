import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resident } from '../residents/entities/resident.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { Visitor } from './entities/visitor.entity';
import { VisitorsController } from './visitors.controller';
import { VisitorsService } from './visitors.service';

@Module({
  imports: [TypeOrmModule.forFeature([Visitor, Resident]), NotificationsModule],
  controllers: [VisitorsController],
  providers: [VisitorsService],
})
export class VisitorsModule {}
