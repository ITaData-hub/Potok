import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getServiceInfo() {
    return {
      service: 'Task Distribution Service',
      version: '1.0.0',
      description: 'Intelligent task distribution with user state awareness',
    };
  }
}
