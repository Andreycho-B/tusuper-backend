import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { JwtAuthGuard } from '../auth/guards/auth.guard';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'The order has been successfully created.', type: Order })
  create(@Req() req: any, @Body() createOrderDto: CreateOrderDto): Promise<Order> {
    // El customerId se obtiene de forma segura desde el payload del JWT (req.user.sub)
    const customerId = req.user.sub;
    return this.ordersService.create(customerId, createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all orders' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved all orders.', type: [Order] })
  findAll(): Promise<Order[]> {
    return this.ordersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a specific order by ID' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved the order.', type: Order })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Order> {
    return this.ordersService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a specific order (Soft Cancel)' })
  @ApiResponse({ status: 200, description: 'The order has been successfully cancelled.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.ordersService.remove(id);
  }
}