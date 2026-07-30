import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GeneralReportsService } from './general-reports.service';
import { CreateGeneralReportDto } from './dto/create-general-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('general-reports')
@UseGuards(JwtAuthGuard)
export class GeneralReportsController {
  constructor(private readonly generalReportsService: GeneralReportsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Req() req: any,
    @Body() createDto: CreateGeneralReportDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const userId = req.user?.sub || req.user?.id;

    if (createDto.image) {
      delete createDto.image;
    }

    return this.generalReportsService.create(tenantId, userId, createDto, file);
  }

  @Get()
  async findAll(@Req() req: any) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    return this.generalReportsService.findAllByTenant(tenantId);
  }
}
