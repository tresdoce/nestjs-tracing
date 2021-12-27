import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Scope } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces/features/arguments-host.interface';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { Span, Tags } from 'opentracing';

import { TracingService } from './tracing.service';
import { markAsErroredSpan, SpanService } from './span.service';
import { RequestContext } from './request-context';
import { RequestSpanService } from './request-span.service';
import { EXCEPT_TRACING_INTERCEPTOR } from './tracing.keys';

@Injectable({ scope: Scope.REQUEST })
export class TracingInterceptor implements NestInterceptor {
  private url: string;
  private span: Span;
  private reflector: Reflector = new Reflector();
  private ctx: HttpArgumentsHost;
  private request: Request;
  private response: Response;

  constructor(
    private readonly tracingService: TracingService,
    private readonly spanService: SpanService,
    private readonly requestContext: RequestContext,
    private readonly requestSpan: RequestSpanService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> | Promise<Observable<any>> {
    const except = this.reflector.get<boolean>(EXCEPT_TRACING_INTERCEPTOR, context.getHandler());

    if (except) return next.handle();
    if (!this.tracingService) return next.handle();

    const contextType = `${context.getType()}`;
    const constructorRef = `${context.getClass().name}`;
    const handlerRef = `${context.getHandler().name}`;
    const operation = [contextType, constructorRef, handlerRef].join(':');

    console.log('OPERATION: ', operation);

    this.ctx = context.switchToHttp();
    this.request = this.ctx.getRequest();
    this.response = this.ctx.getResponse();
    this.url = this.request.path === '/' ? `${this.request.headers.host}` : `${this.request.path}`;

    const parentSpanContext = this.tracingService.getParentSpanOptions(this.request.headers);

    console.log('PARENT SPAN CONTEXT: ', parentSpanContext);

    this.span = this.spanService.startActiveSpan(this.url, parentSpanContext);
    this.span.addTags({
      operation,
      controller: constructorRef,
      handler: handlerRef,
      [Tags.COMPONENT]: contextType,
      [Tags.SPAN_KIND]: Tags.SPAN_KIND_MESSAGING_PRODUCER,
      [Tags.HTTP_METHOD]: this.request.method,
      [Tags.HTTP_URL]: this.url,
    });
    this.span.log({ event: 'request_received' });

    const responseHeaders = {};
    this.tracingService.setSpanContext(this.span, responseHeaders);
    this.response.set(responseHeaders);
    //Object.assign(this.request, { span: this.span });

    if (!this.span) return next.handle();
    this.tracingService.propagateSpanContext(this.request.headers);
    this.spanService.setSpanTags(this.span, this.request.headers);
    this.tracingService.setSpanContext(this.span, this.request.headers);
    this.requestSpan.set(this.span);

    const childSpan = this.spanService.startActiveSpan(this.url, {
      childOf: this.span,
    });
    childSpan.addTags({
      operation,
      controller: constructorRef,
      handler: handlerRef,
      [Tags.COMPONENT]: contextType,
      [Tags.SPAN_KIND]: Tags.SPAN_KIND_MESSAGING_PRODUCER,
      [Tags.HTTP_METHOD]: this.request.method,
      [Tags.HTTP_URL]: this.url,
    });
    childSpan.log({ event: 'request_received' });

    return next.handle().pipe(
      tap(() => {
        childSpan.setTag(Tags.HTTP_STATUS_CODE, this.response.statusCode);
        this.span.setTag(Tags.HTTP_STATUS_CODE, this.response.statusCode);
        childSpan.log({ event: 'response_received' });
        this.span.log({ event: 'response_received' });
        if (this.response.statusCode >= 500) {
          markAsErroredSpan(childSpan);
          markAsErroredSpan(this.span);
        }
        this.spanService.finishSpan(childSpan);
        this.spanService.finishSpan(this.span);
      }),
    );
  }
}
