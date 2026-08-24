import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminService } from './admin.service';
import { CreateAdminUserDto, UpdateAdminUserDto } from './dto/admin-user.dto';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly admin: AdminService) {}
  @Get('metrics') metrics() { return this.admin.metrics(); }
  @Get('users') listUsers() { return this.admin.listUsers(); }
  @Post('users') createUser(@Body() body: CreateAdminUserDto) { return this.admin.createUser(body); }
  @Patch('users/:id') updateUser(@Param('id') id: string, @Body() body: UpdateAdminUserDto) { return this.admin.updateUser(id, body); }
  @Delete('users/:id') removeUser(@Param('id') id: string) { return this.admin.removeUser(id); }
}
