import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ModulesService } from './modules.service';
import { CreateModuleDto } from './dtos/create-module.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { ModulesGuard } from '../auth/guards/modules.guard.guard';
import { Modules } from '../auth/decorators/modules.decorator';

@ApiBearerAuth()
@Modules('modules')
@UseGuards(JwtAuthGuard, ModulesGuard)
@ApiTags('Modules')
@Controller('modules')
export class ModulesController {

  constructor(private readonly modulesService: ModulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new module' })
  create(@Body() dto: CreateModuleDto) {
    return this.modulesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all modules' })
  findAll() {
    return this.modulesService.findAll();
  }

}