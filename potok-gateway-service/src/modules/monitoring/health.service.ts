import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class HealthService {
  constructor() {}


  async checkReadiness() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }
}