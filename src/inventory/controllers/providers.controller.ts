import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProvidersService } from '../services/providers.service';
import { CreateProviderDto, UpdateProviderDto } from '../dtos/provider.dto';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { ModulesGuard } from '../../auth/guards/modules.guard.guard';
import { Modules } from '../../auth/decorators/modules.decorator';
import { Provider } from '../entities/provider.entity';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@ApiBearerAuth()
@Modules('inventory')
@UseGuards(JwtAuthGuard, ModulesGuard)
@ApiTags('Inventory - Providers')
@Controller('inventory/providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) { }

  @Get()
  @ApiOperation({ summary: 'Get all providers' })
  @ApiResponse({ status: 200, description: 'List of providers' })
  async findAll(@Query() pagination: PaginationDto): Promise<PaginatedResult<Provider>> {
    return this.providersService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get provider by ID' })
  @ApiResponse({ status: 200, description: 'Provider found' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Provider> {
    return this.providersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new provider' })
  @ApiResponse({ status: 201, description: 'Provider created successfully' })
  async create(@Body() createProviderDto: CreateProviderDto): Promise<Provider> {
    return this.providersService.create(createProviderDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a provider by ID' })
  @ApiResponse({ status: 200, description: 'Provider updated successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProviderDto: UpdateProviderDto,
  ): Promise<Provider> {
    return this.providersService.update(id, updateProviderDto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a provider by ID' })
  @ApiResponse({ status: 204, description: 'Provider deleted successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<Provider> {
    return this.providersService.remove(id);
  }
}
