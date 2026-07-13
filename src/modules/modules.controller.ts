import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ModulesService } from './modules.service';
import { CreateModuleDto } from './dtos/create-module.dto';
import { UpdateModuleDto } from './dtos/update-module.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { ModulesGuard } from '../auth/guards/modules.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Modules } from '../auth/decorators/modules.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ModuleEntity } from './entities/module.entity';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

@ApiBearerAuth()
@Modules('modules')
@Roles('ADMIN')
@UseGuards(JwtAuthGuard, ModulesGuard, RolesGuard)
@ApiTags('Modules')
@Controller('modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new module' })
  create(@Body() dto: CreateModuleDto): Promise<ModuleEntity> {
    return this.modulesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all modules' })
  findAll(
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResult<ModuleEntity>> {
    return this.modulesService.findAll(pagination);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a module' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateModuleDto,
  ): Promise<ModuleEntity> {
    return this.modulesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a module' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.modulesService.remove(id);
  }
}
