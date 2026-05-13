import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({
    status: 201,
    description: 'The order has been successfully created.',
    type: Order,
  })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<Order> {
    return this.ordersService.create(req.user.userId, createOrderDto);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Simulate MVP Checkout' })
  @ApiResponse({
    status: 201,
    description:
      'Simulates checkout, applies pessimistic lock, and returns PAID order.',
    type: Order,
  })
  checkout(
    @Req() req: AuthenticatedRequest,
    @Body() checkoutDto: CheckoutDto,
  ): Promise<Order> {
    return this.ordersService.checkout(req.user.userId, checkoutDto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TENDERO')
  @ApiOperation({ summary: 'List all orders (ADMIN only) with filters' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of all orders with customer and item details.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN role.' })
  findAllAdmin(
    @Query() filters: OrderFilterDto,
  ): Promise<PaginatedResult<Order>> {
    return this.ordersService.findAllAdmin(filters);
  }

  @Get('my-orders')
  @ApiOperation({ summary: 'List orders for the authenticated user' })
  @ApiResponse({
    status: 200,
    description:
      'Paginated list of orders belonging to the authenticated user.',
  })
  findMyOrders(
    @Req() req: AuthenticatedRequest,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResult<Order>> {
    return this.ordersService.findMyOrders(req.user.userId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a specific order by ID' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved the order.',
    type: Order,
  })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<Order> {
    const order = await this.ordersService.findOne(id);
    const isStaff = req.user.roles.some(
      (r) => r.name === 'ADMIN' || r.name === 'TENDERO',
    );

    if (!isStaff && order.customer.id !== req.user.userId) {
      throw new ForbiddenException('No tienes permiso para ver este pedido');
    }
    return order;
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TENDERO')
  @ApiOperation({ summary: 'Update order status (ADMIN only)' })
  @ApiResponse({
    status: 200,
    description: 'Order status updated successfully.',
    type: Order,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition.' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN role.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<Order> {
    return this.ordersService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TENDERO')
  @ApiOperation({
    summary: 'Cancel a specific order (Soft Cancel + Stock Restore)',
  })
  @ApiResponse({
    status: 200,
    description:
      'The order has been successfully cancelled and stock restored.',
  })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.ordersService.remove(id);
  }
}
