import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TracingModule } from '../tracing/tracing.module';
import { otelSDK } from '../tracing/constants/open-telemetry.constants';
import { OpenTelemetryConfiguration } from '../tracing/interfaces/tracing.interface';

const mockedOTELConfiguration: OpenTelemetryConfiguration = {
  serviceName: 'test OTEL',
  prometheusExporterConfig: {
    port: 89247,
  },
  metricInterval: 1000,
  jaegerExporterConfig: {
    endpoint: 'http://localhost:14268/api/traces',
  },
};

describe('TracingModule', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TracingModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await otelSDK(mockedOTELConfiguration).start();
    await app.init();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });
});
