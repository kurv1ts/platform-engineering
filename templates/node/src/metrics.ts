
import client from "prom-client";
const collectDefaultMetrics = client.collectDefaultMetrics;
const Registry = client.Registry;
export const register = new Registry();
collectDefaultMetrics({ register });

export const httpRequestCounter = new client.Counter({
    name: `app_http_requests_total`,
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
    registers: [register],
});

export const httpRequestDuration = new client.Histogram({
    name: `app_http_request_duration_ms`,
    help: 'HTTP request duration in milliseconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000],
    registers: [register],
});