
import client from "prom-client";
import { getEnv } from "./env/env";
const collectDefaultMetrics = client.collectDefaultMetrics;
const Registry = client.Registry;
export const register = new Registry();
collectDefaultMetrics({ register });

const ENV = getEnv();

export const httpRequestCounter = new client.Counter({
    name: `${ENV.METRICS_PREFIX}http_requests_total`,
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
    registers: [register],
});

export const httpRequestDuration = new client.Histogram({
    name: `${ENV.METRICS_PREFIX}http_request_duration_ms`,
    help: 'HTTP request duration in milliseconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000],
    registers: [register],
});