import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

interface JwtPayload {
  sub: number;
  roles: string[];
}

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:4200',
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('authenticate')
  async handleAuthenticate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { token: string },
  ) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(data.token);
      const userId = payload.sub;
      const roles = payload.roles || [];

      this.logger.log(
        `User ${userId} authenticated with roles: ${roles.join(', ')}`,
      );

      // Unir a rooms segun roles
      if (roles.includes('ADMIN')) {
        await client.join('admin-room');
        this.logger.log(`Client ${client.id} joined admin-room`);
      }

      if (roles.includes('TENDERO')) {
        await client.join('tendero-room');
        this.logger.log(`Client ${client.id} joined tendero-room`);
      }

      if (roles.includes('USER')) {
        await client.join(`user-room-${userId}`);
        this.logger.log(`Client ${client.id} joined user-room-${userId}`);
      }

      return { status: 'authenticated' };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Authentication failed for client ${client.id}: ${errorMessage}`,
      );
      client.disconnect();
      return { status: 'error', message: 'Unauthorized' };
    }
  }
}
