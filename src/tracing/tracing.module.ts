import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { TRACER_OPTIONS } from './tracing.keys';
import { TracerConfiguration, TracerModuleAsyncOptions } from './types';
import { TracingMiddleware } from './tracing.middleware';
import { SpanService } from './span.service';
import { TracingService } from './tracing.service';
import { RequestContext } from './request-context';
import { RequestSpanService } from './request-span.service';
import { TracingInterceptor } from './tracing.interceptor';

@Global()
@Module({})
export class TracingModule {
  static forRootAsync(options: TracerModuleAsyncOptions): DynamicModule {
    const imports = [...(options.imports ?? [])];
    const providers = getProviders();

    if ('useExisting' in options) {
      providers.push({
        provide: TRACER_OPTIONS,
        useExisting: options.useExisting,
      });
    } else {
      providers.push({
        provide: TRACER_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject,
      });
    }

    return {
      global: true,
      module: TracingModule,
      providers,
      imports,
      exports: [...providers, TRACER_OPTIONS],
    };
  }

  static forRoot(options: TracerConfiguration): DynamicModule {
    const providers = getProviders();

    return {
      global: true,
      module: TracingModule,
      providers: [...providers, { provide: TRACER_OPTIONS, useValue: { ...options } }],
      exports: [...providers, TRACER_OPTIONS],
    };
  }
}

const getProviders = (): Provider[] => {
  return [
    TracingInterceptor,
    TracingMiddleware,
    SpanService,
    TracingService,
    RequestContext,
    RequestSpanService,
  ];
};
