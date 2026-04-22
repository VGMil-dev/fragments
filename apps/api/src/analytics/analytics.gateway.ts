import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust for production
  },
})
export class AnalyticsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:teacher')
  handleJoinTeacher(client: Socket, teacherId: string) {
    client.join(`teacher:${teacherId}`);
    console.log(`Client ${client.id} joined room teacher:${teacherId}`);
  }

  emitSubmission(teacherId: string, data: any) {
    this.server.to(`teacher:${teacherId}`).emit('analytics:submission', data);
  }
}
