import { ModuleMetadata, Provider } from '@nestjs/common';
import { TracingConfig, TracingOptions } from 'jaeger-client';
import { Span, SpanOptions } from 'opentracing';

export type TracerModuleAsyncOptions = Pick<ModuleMetadata, 'imports'> &
  (
    | { useExisting: Provider | string | symbol }
    | {
        useFactory: (...args: any[]) => Promise<TracerConfiguration> | TracerConfiguration;
        inject?: any[];
      }
  );

export interface TracerConfiguration {
  config?: TracingConfig;
  options?: TracingOptions;
}

export interface WithSpanOptions<R = unknown> {
  name: string;
  handler: (span: Span) => R;
  active?: boolean;
  options?: SpanOptions;
}
