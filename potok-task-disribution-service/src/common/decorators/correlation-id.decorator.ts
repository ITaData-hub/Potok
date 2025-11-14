import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CORRELATION_ID_HEADER } from '../constants';

export const CorrelationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const correlationId = request.headers[CORRELATION_ID_HEADER] || uuidv4();
    request.correlationId = correlationId;
    return correlationId;
  },
);
