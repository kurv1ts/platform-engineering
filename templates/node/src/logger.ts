import winston from 'winston';
import { context, trace } from '@opentelemetry/api';

import { getEnv } from './env/env';

const withTraceIds = winston.format((log) => {
    const span = trace.getSpan(context.active());
    if (span) {
        const ctx = span.spanContext();
        log.trace_id = ctx.traceId;
        log.span_id = ctx.spanId;
    }
    return log;
});

export const logger = winston.createLogger({
    level: 'info',
    levels: winston.config.npm.levels,
    format: winston.format.combine(
        withTraceIds(),
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: getEnv().SERVICE_NAME },
    transports: [new winston.transports.Console()]
});