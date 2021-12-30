import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { Span, Tags } from 'opentracing';
import { RequestSpanService } from './request-span.service';
import { RequestContext } from './request-context';
import { markAsErroredSpan, SpanService } from './span.service';
import { TracingService } from './tracing.service';

@Injectable()
export class TracingMiddleware implements NestMiddleware {
  // master span instance, can have multiple child span inside
  private span: Span;
  //private spanChildren: any = undefined;

  constructor(
    private readonly tracingService: TracingService,
    private readonly spanService: SpanService,
    private readonly requestContext: RequestContext,
    private readonly requestSpan: RequestSpanService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    this.requestContext.run(() => {
      const parentSpanContext = this.tracingService.extractSpanFromHeaders(req.headers);

      const url = req.path !== '/' ? `${req.baseUrl}${req.path}` : `${req.baseUrl}`;

      this.span = this.spanService.startActiveSpan(url, {
        childOf: parentSpanContext,
      });
      this.span.addTags({
        [Tags.SPAN_KIND]: Tags.SPAN_KIND_MESSAGING_PRODUCER,
        [Tags.HTTP_METHOD]: req.method,
        [Tags.HTTP_URL]: url,
      });
      this.span.log({ event: 'request_received' });

      //const responseHeaders = {};
      //this.tracingService.setSpanContext(this.span, responseHeaders);
      //res.set(responseHeaders);
      //this.tracingService.addTracingHeaders(req.headers)
      //Object.assign(req, { span: this.span });

      this.requestSpan.set(this.span);

      res.once('finish', () => {
        this.span.setTag(Tags.HTTP_STATUS_CODE, res.statusCode);

        if (res.statusCode >= 500) {
          markAsErroredSpan(this.span);
        }
        this.spanService.finishSpan(this.span);
      });

      next();
    });
  }
}
