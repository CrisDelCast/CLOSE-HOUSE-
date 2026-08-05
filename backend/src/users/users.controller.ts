import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@Req() req: Request) {
    const payload = req.user as JwtPayload;
    const user = await this.usersService.findById(payload.sub);
    return this.usersService.sanitize(user);
  }

  @Get()
  @Roles('SUPERADMIN')
  async findByTenant(@Query('tenantId') tenantId?: string) {
    if (!tenantId) {
      throw new BadRequestException('Se requiere especificar un conjunto (tenantId).');
    }

    const users = await this.usersService.findByTenant(tenantId);
    return users.map((user) => this.usersService.sanitize(user));
  }

  @Post()
  @Roles('SUPERADMIN')
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return this.usersService.sanitize(user);
  }

  @Patch(':id')
  @Roles('SUPERADMIN')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    const payload = req.user as JwtPayload;
    const user = await this.usersService.update(id, dto, payload.sub);
    return this.usersService.sanitize(user);
  }

  @Delete(':id')
  @Roles('SUPERADMIN')
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const payload = req.user as JwtPayload;
    return this.usersService.remove(id, payload.sub);
  }
}
