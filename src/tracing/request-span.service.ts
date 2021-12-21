import { Injectable } from '@nestjs/common';
import { Span } from 'opentracing';
import { RequestContext } from './request-context';
import { REQUEST_SPAN } from './tracing.keys';

@Injectable()
export class RequestSpanService {
  constructor(private readonly requestContext: RequestContext) {}

  get(): Span | undefined {
    return this.requestContext.get(REQUEST_SPAN) as Span | undefined;
  }

  set(span: Span): void {
    if (!this.requestContext.has(REQUEST_SPAN)) {
      this.requestContext.set(REQUEST_SPAN, span);
    }
  }
}
