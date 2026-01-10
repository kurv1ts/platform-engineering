import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { getEnv } from './env/env';

export const initTracing = () => {
    const ENV = getEnv();
    
    const traceExporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
        ? new OTLPTraceExporter({
            url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
        })
        : new ConsoleSpanExporter();

    const openTelemetry = new NodeSDK({
        traceExporter,
        instrumentations: [getNodeAutoInstrumentations()],
        serviceName: ENV.SERVICE_NAME,
    });

    openTelemetry.start();
    
    console.log(`OpenTelemetry initialized: ${ENV.SERVICE_NAME}`);
    console.log(`Trace exporter: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'console'}`);
    
    return openTelemetry;
};
