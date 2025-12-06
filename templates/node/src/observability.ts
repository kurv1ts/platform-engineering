import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import * as api from '@opentelemetry/api';
import { getEnv } from './env/env';

export const initTracing = () => {
    const openTelemetry = new NodeSDK({
        traceExporter: new ConsoleSpanExporter(),
        instrumentations: [getNodeAutoInstrumentations()],
        serviceName: getEnv().SERVICE_NAME,
    });

    openTelemetry.start();
    return openTelemetry;
};
