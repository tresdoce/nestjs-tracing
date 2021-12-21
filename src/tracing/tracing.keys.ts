import { Inject } from '@nestjs/common';
import { Tags } from 'opentracing';

/**
 * Injection token for the tracer options
 *
 * @example
 *
 * ```ts
 * @Injectable()
 * class MyProvider {
 *   constructor(@Inject(TRACER_OPTIONS) private readonly config: TracerConfiguration) {}
 * }
 * ```
 */
export const TRACER_OPTIONS = Symbol('tracer.TRACER_OPTIONS');

export function InjectTracerOptions(): ParameterDecorator {
  return Inject(TRACER_OPTIONS);
}

export const SPAN_ERROR = Symbol('SPAN_ERROR');

export const ACTIVE_SPAN = Symbol('ACTIVE_SPAN');

export const REQUEST_SPAN = Symbol('REQUEST_SPAN');

export const TAGS = {
  ...Tags,
  PROTOCAL: 'protocal',
  TRACING_TAG: 'tracing-tag',
};

export const EXCEPT_TRACING_INTERCEPTOR = 'EXCEPT_TRACING_INTERCEPTOR';
