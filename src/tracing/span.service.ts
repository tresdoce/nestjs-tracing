import { Injectable } from '@nestjs/common';
import { Span, SpanOptions, Tags } from 'opentracing';
import { RequestContext } from './request-context';
import { TracingService } from './tracing.service';
import { WithSpanOptions } from './types';
import { ACTIVE_SPAN, SPAN_ERROR, TAGS } from './tracing.keys';
import { IncomingHttpHeaders } from 'http';

@Injectable()
export class SpanService {
  constructor(
    private readonly tracerService: TracingService,
    private readonly requestContext: RequestContext,
  ) {}

  /** Start a new span */
  startSpan(name: string, options?: SpanOptions): Span {
    return this.tracerService.getTracer().startSpan(name, options);
  }

  /** Start a new span and set it as the active span */
  startActiveSpan(name: string, options?: SpanOptions): Span {
    const span = this.startSpan(name, options);

    this.requestContext.set(ACTIVE_SPAN, span);

    return span;
  }

  /** Set tags span */
  setSpanTags(span: Span, headers: IncomingHttpHeaders): void {
    let tracing_tag: any;
    console.log('HEADERS: ', headers);
    if (headers && headers[TAGS.TRACING_TAG]) {
      console.log('lo tomo');
      tracing_tag = JSON.parse(<string>headers[TAGS.TRACING_TAG]);
    }
    for (const key in tracing_tag) {
      span.setTag(key, tracing_tag[key]);
    }
  }

  /** Finalizes the given span. If the span is the active span it is also unset */
  finishSpan(span: Span): void {
    span.finish();

    const activeSpan = this.getActiveSpan();

    if (span === activeSpan) {
      this.requestContext.delete(ACTIVE_SPAN);
    }
  }

  /** Get the active span. If there is no active span it returns `undefined` */
  getActiveSpan(): Span | undefined {
    return this.requestContext.get(ACTIVE_SPAN) as Span | undefined;
  }

  /**
   * Run the given handler for an span context.
   * When the handler is finished the span is also automatically finished
   */
  async withSpan<R>({ name, active = false, options, handler }: WithSpanOptions<R>): Promise<R> {
    const span = active ? this.startActiveSpan(name, options) : this.startSpan(name, options);

    try {
      return await handler(span);
    } finally {
      this.finishSpan(span);
    }
  }
}

/** Check if the given span has been marked as error  */
export const isErroredSpan = (span: Span): boolean => {
  return (span as any)[SPAN_ERROR] === true;
};

/**
 * Marks the span as error span.
 * Use this instead of `span.setTag('error', true)` because it only will not set the error tag more than once
 */
export const markAsErroredSpan = (span: Span): void => {
  if (isErroredSpan(span)) {
    return;
  }

  (span as any)[SPAN_ERROR] = true;
  span.setTag(Tags.ERROR, true);
};
