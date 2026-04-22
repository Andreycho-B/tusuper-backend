import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import * as express from 'express';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'The order has been successfully created.', type: Order })
  create(@Req() req: express.Request, @Body() createOrderDto: CreateOrderDto): Promise<Order> {
    const customerId: number = (req as unknown as AuthenticatedRequest).user.userId;
    return this.ordersService.create(customerId, createOrderDto);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Simulate MVP Checkout' })
  @ApiResponse({ status: 201, description: 'Simulates checkout, applies pessimistic lock, and returns PAID order.', type: Order })
  checkout(@Req() req: express.Request, @Body() checkoutDto: CheckoutDto): Promise<Order> {
    const customerId: number = (req as unknown as AuthenticatedRequest).user.userId;
    return this.ordersService.checkout(customerId, checkoutDto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all orders' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved all orders.' })
  findAll(@Query() pagination: PaginationDto): Promise<PaginatedResult<Order>> {
    return this.ordersService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a specific order by ID' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved the order.', type: Order })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Order> {
    return this.ordersService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a specific order (Soft Cancel + Stock Restore)' })
  @ApiResponse({ status: 200, description: 'The order has been successfully cancelled and stock restored.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.ordersService.remove(id);
  }
}