import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { Tags } from 'opentracing';
import { RequestSpanService } from './request-span.service';
import { RequestContext } from './request-context';
import { markAsErroredSpan, SpanService } from './span.service';
import { TracingService } from './tracing.service';

@Injectable()
export class TracingMiddleware implements NestMiddleware {
  // master span instance, can have multiple child span inside
  //private span: any = undefined;
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
      //const parentObj = parentSpanContext ? { childOf: parentSpanContext } : {};

      const url = req.path !== '/' ? `${req.baseUrl}${req.path}` : `${req.baseUrl}`;

      const span = this.spanService.startActiveSpan(url, {
        //...parentObj,
        childOf: parentSpanContext,
        tags: {
          [Tags.SPAN_KIND]: Tags.SPAN_KIND_MESSAGING_PRODUCER,
          [Tags.HTTP_METHOD]: req.method,
          [Tags.HTTP_URL]: url,
        },
      });

      //if (!span) return next();
      //this.spanService.setSpanTags(span, req.headers);
      //this.tracingService.distributedSpan(span, req.headers);
      this.requestSpan.set(span);

      /*const spanChildren = this.spanService.startActiveSpan(url, {
        childOf: span,
        tags: {
          [Tags.SPAN_KIND]: Tags.SPAN_KIND_MESSAGING_PRODUCER,
          [Tags.HTTP_METHOD]: req.method,
          [Tags.HTTP_URL]: url,
        },
      })*/

      /*if (!spanChildren) return next();

      this.spanService.setSpanTags(spanChildren, req.headers);
      this.tracingService.distributedSpan(span, {});
      this.requestSpan.set(spanChildren);*/

      res.once('finish', () => {
        //spanChildren.setTag(Tags.HTTP_STATUS_CODE, res.statusCode);
        span.setTag(Tags.HTTP_STATUS_CODE, res.statusCode);

        if (res.statusCode >= 500) {
          //markAsErroredSpan(spanChildren);
          markAsErroredSpan(span);
        }

        //this.spanService.finishSpan(spanChildren);
        this.spanService.finishSpan(span);
      });

      next();
    });
  }
}
