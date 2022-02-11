import { ResourceAttributes } from '@opentelemetry/resources';
import { ExporterConfig as PrometheusExporterConfig } from '@opentelemetry/exporter-prometheus';
import { ExporterConfig as JaegerExporterConfig } from '@opentelemetry/exporter-jaeger';
import { IgnoreMatcher } from '@opentelemetry/instrumentation-http';

export interface Tag {
  key: string;
  value: string | number | boolean;
}

export interface OpenTelemetryConfiguration {
  serviceName: string;
  metricInterval?;
  resourceAttributes?: ResourceAttributes;
  prometheusExporterConfig?: PrometheusExporterConfig;
  jaegerExporterConfig?: JaegerExporterConfig;
  excludeTracerPaths?: IgnoreMatcher[];
}
