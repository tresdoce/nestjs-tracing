import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Scope } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

import { TracingService } from './tracing.service';
import { markAsErroredSpan, SpanService } from './span.service';
import { RequestContext } from './request-context';
import { RequestSpanService } from './request-span.service';
import { EXCEPT_TRACING_INTERCEPTOR } from './tracing.keys';
import { Span, Tags } from 'opentracing';

@Injectable({ scope: Scope.REQUEST })
export class TracingInterceptor implements NestInterceptor {
  private reflector: Reflector;
  private span: Span;
  private request: Request;
  private response: Response;

  constructor(
    private readonly tracingService: TracingService,
    private readonly spanService: SpanService,
    private readonly requestContext: RequestContext,
    private readonly requestSpan: RequestSpanService,
  ) {
    this.reflector = new Reflector();
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> | Promise<Observable<any>> {
    const except = this.reflector.get<boolean>(EXCEPT_TRACING_INTERCEPTOR, context.getHandler());

    if (except) return next.handle();
    if (!this.tracingService) return next.handle();

    this.request = context.switchToHttp().getRequest();
    this.response = context.switchToHttp().getResponse();
    const url = this.request.path === '/' ? `${this.request.headers.host}` : `${this.request.path}`;
    const contextType = `${context.getType()}`;
    const constructorRef = `${context.getClass().name}`;
    const handlerRef = `${context.getHandler().name}`;
    const operation = [contextType, constructorRef, handlerRef].join(':');

    console.log('OPERATION: ', operation);

    const parentSpanContext = this.tracingService.extractSpanFromHeaders(this.request.headers);
    console.log('PARENT SPAN CONTEXT: ', parentSpanContext);

    const parentObj = parentSpanContext
      ? {
          childOf: parentSpanContext,
          tags: {
            operation,
            controller: constructorRef,
            handler: handlerRef,
            [Tags.COMPONENT]: contextType,
            [Tags.SPAN_KIND]: Tags.SPAN_KIND_MESSAGING_PRODUCER,
            [Tags.HTTP_METHOD]: this.request.method,
            [Tags.HTTP_URL]: url,
          },
        }
      : {
          tags: {
            operation,
            controller: constructorRef,
            handler: handlerRef,
            [Tags.COMPONENT]: contextType,
            [Tags.SPAN_KIND]: Tags.SPAN_KIND_MESSAGING_PRODUCER,
            [Tags.HTTP_METHOD]: this.request.method,
            [Tags.HTTP_URL]: url,
          },
        };

    this.span = this.spanService.startActiveSpan(url, parentObj);
    this.span.log({ event: 'request_received' });

    console.log('SPAN: ', this.span);

    const responseHeaders = {};
    this.tracingService.setSpanContext(this.span, responseHeaders);
    this.response.set(responseHeaders);
    Object.assign(this.request, { span: this.span });

    if (!this.span) return next.handle();
    //this.spanService.setSpanTags(this.span, this.request.headers);
    this.tracingService.setSpanContext(this.span, this.request.headers);
    this.requestSpan.set(this.span);

    return next.handle().pipe(
      tap(() => {
        this.span.setTag(Tags.HTTP_STATUS_CODE, this.response.statusCode);
        this.span.log({ event: 'response_received' });
        if (this.response.statusCode >= 500) {
          markAsErroredSpan(this.span);
        }
        this.spanService.finishSpan(this.span);
      }),
    );
  }
}
