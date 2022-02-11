import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { otelSDK } from '../tracing/constants/open-telemetry.constants';
import { OpenTelemetryConfiguration } from '../tracing/interfaces/tracing.interface';
import { TracingService } from '../tracing/services/tracing.service';
import { TracingModule } from '../tracing/tracing.module';
import * as api from '@opentelemetry/api';

let service: TracingService;
const mockedOTELConfiguration: OpenTelemetryConfiguration = {
  serviceName: 'test OTEL',
  prometheusExporterConfig: {
    port: 89248,
  },
  metricInterval: 1000,
  jaegerExporterConfig: {
    endpoint: 'http://localhost:14268/api/traces',
  },
};
describe('TracingService', () => {
  let app: INestApplication;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TracingModule],
    }).compile();
    app = module.createNestApplication();
    await otelSDK(mockedOTELConfiguration).start();
    await app.init;
    service = module.get<TracingService>(TracingService);
  });

  it('should be defined', () => {
    service.getSpan();
    service.getSpanContext();
    service.setSpanTags(api.trace.getSpan(api.context.active()), {
      'tracing-tag': '27',
    });
    expect(service).toBeDefined();
  });
});
