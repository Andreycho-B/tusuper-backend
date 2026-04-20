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
    NotFoundException,
    BadRequestException,
    UseGuards,
} from '@nestjs/common';
import { RolesService } from '../services/roles.service';
import { CreateRoleDto, UpdateRoleDto } from '../dtos/role.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Modules } from '../../auth/decorators/modules.decorator';
import { ModulesGuard } from '../../auth/guards/modules.guard.guard';
import { Role } from '../entities/role.entity';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@ApiBearerAuth()
@Modules('roles')
@UseGuards(JwtAuthGuard, ModulesGuard)
@ApiTags('Roles')
@Controller('roles')
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    // Crear rol
    @Post()
    @ApiOperation({ summary: 'Create a new role' })
    @ApiResponse({ status: 201, description: 'Role created successfully' })
    async create(@Body() createRoleDto: CreateRoleDto): Promise<Role> {
        return this.rolesService.create(createRoleDto);
    }

    // Listar todos los roles
    // @UseGuards(JwtAuthGuard)
    @Get()
    @ApiOperation({ summary: 'Get all roles' })
    async findAll(@Query() pagination: PaginationDto): Promise<PaginatedResult<Role>> {
        return this.rolesService.findAll(pagination);
    }

    // Obtener un rol por id
    @Get(':id')
    @ApiOperation({ summary: 'Get role by id' })
    async findOne(@Param('id', ParseIntPipe) id: number): Promise<Role> {
        return this.rolesService.findOne(id);
    }

    // Actualizar un rol
    @Patch(':id')
    @ApiOperation({ summary: 'Update a role by id' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateRoleDto: UpdateRoleDto,
    ): Promise<Role> {
        return this.rolesService.update(id, updateRoleDto);
    }

    // Eliminar un rol
    @Delete(':id')
    @HttpCode(204)
    @ApiOperation({ summary: 'Delete a role by id' })
    async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
        await this.rolesService.remove(id);
    }
}