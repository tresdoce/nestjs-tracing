import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { IncomingHttpHeaders } from 'http';
import { initTracer, JaegerTracer } from 'jaeger-client';
import { FORMAT_HTTP_HEADERS, Span, SpanContext, SpanOptions } from 'opentracing';

import { TracingInitializationError } from './tracing-initialization.error';
import { InjectTracerOptions } from './tracing.keys';
import { TracerConfiguration } from './types';

@Injectable()
export class TracingService implements OnModuleInit, OnModuleDestroy {
  private tracer?: JaegerTracer;
  public spanContext: SpanContext;

  constructor(@InjectTracerOptions() private readonly configuration: TracerConfiguration) {}

  /**
   * Get the tracer. If the tracer is not yet initialized it throws a {@link TracingInitializationError}
   */
  getTracer(): JaegerTracer {
    if (!this.tracer) {
      throw new TracingInitializationError();
    }

    return this.tracer;
  }

  /** Extract the span context from the request headers */
  extractSpanFromHeaders(headers: IncomingHttpHeaders): SpanContext | null | undefined {
    return this.getTracer().extract(FORMAT_HTTP_HEADERS, headers) ?? undefined;
  }

  /** Inject span to distributed */
  setSpanContext(spanContext: SpanContext | Span, headers: IncomingHttpHeaders): void {
    this.getTracer().inject(spanContext, FORMAT_HTTP_HEADERS, headers);
    this.spanContext = this.extractSpanFromHeaders(headers);
  }

  /** Get an SpanOptions object with the parent span or null if it do not exists in the carrier. */
  getParentSpanOptions(headers: IncomingHttpHeaders): SpanOptions | Record<string, unknown> {
    const spanContext = this.extractSpanFromHeaders(headers);
    return spanContext ? { childOf: spanContext } : {};
  }

  /** Inject tracingService span options into the carrier if these exists. */
  propagateSpanContext(headers: IncomingHttpHeaders): void {
    this.getTracer().inject(this.spanContext, FORMAT_HTTP_HEADERS, headers);
  }

  /** Initialize the Jaeger tracer. It can only by initialized once son multiple calls will have no effect */
  onModuleInit(): void {
    if (this.tracer) {
      return;
    }

    const { config = {}, options = {} } = this.configuration;

    this.tracer = initTracer(config, options);
  }

  /** Close the current tracer */
  async onModuleDestroy(): Promise<void> {
    // Also check the close function because it does not exist in the noop tracer
    // which is the tracer we get when config.disable is set to true
    //await new Promise<void>(resolve => this.tracer?.close?.(resolve) ?? resolve());
    await new Promise<void>((resolve) => this.tracer?.close?.(resolve));

    this.tracer = undefined;
  }
}
