import express, { Request, Response } from 'express';
import winston from 'winston';
import axios from 'axios';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import * as api from '@opentelemetry/api';

// --- Metrics Setup (Prometheus Exporter) ---
const prometheusExporter = new PrometheusExporter({
    port: 9464,
}, () => {
    console.log('Prometheus scrape endpoint: http://localhost:9464/metrics');
});

// --- OpenTelemetry SDK with both Tracing and Metrics ---
const sdk = new NodeSDK({
    traceExporter: new ConsoleSpanExporter(),
    metricReader: prometheusExporter,
    instrumentations: [getNodeAutoInstrumentations()],
    serviceName: 'platform-service',
});

sdk.start();

// Get meter for custom metrics
const meter = api.metrics.getMeter('platform-service');

// Custom counter for HTTP requests
const httpRequestCounter = meter.createCounter('http_requests_total', {
    description: 'Total number of HTTP requests',
});

// Custom histogram for HTTP request duration
const httpRequestDuration = meter.createHistogram('http_request_duration_ms', {
    description: 'HTTP request duration in milliseconds',
    unit: 'ms',
});

// --- Logger Setup ---
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'platform-service' },
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
});

const app = express();
const PORT = process.env.PORT || 7000;

// Configurable URLs
const RENTAL_SERVICE_URL = process.env.RENTAL_SERVICE_URL || 'http://localhost:7001';
const VEHICLES_SERVICE_URL = process.env.VEHICLES_SERVICE_URL || 'http://localhost:7002';

// --- Endpoints ---

app.get('/health', (req: Request, res: Response) => {
    res.status(200).send('OK');
});

// Middleware to track requests and duration
app.use((req: Request, res: Response, next) => {
    if (req.path === '/metrics') return next();

    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;

        // Record counter
        httpRequestCounter.add(1, {
            method: req.method,
            route: req.path,
            status: res.statusCode.toString(),
        });

        // Record duration
        httpRequestDuration.record(duration, {
            method: req.method,
            route: req.path,
            status: res.statusCode.toString(),
        });
    });

    next();
});

// --- Scheduler ---
const SCHEDULER_INTERVAL = Math.floor(Math.random() * 2000);
let schedulerInterval: NodeJS.Timeout | null = null;

const makeRequests = async () => {
    logger.info('Scheduler: Making requests to downstream services...');

    // Request to Rental Service
    try {
        const vehicleId = Math.floor(Math.random() * 100);
        await axios.get(`${RENTAL_SERVICE_URL}/history/${vehicleId}`);
        logger.info(`Scheduler: Successfully called Rental Service history for ${vehicleId}`);
    } catch (error: any) {
        logger.error(`Scheduler: Error calling Rental Service: ${error.message}`);
    }

    // Request to Vehicles Service
    try {
        const vehicleId = Math.floor(Math.random() * 100);
        await axios.get(`${VEHICLES_SERVICE_URL}/vehicles/${vehicleId}`);
        logger.info(`Scheduler: Successfully called Vehicles Service details for ${vehicleId}`);
    } catch (error: any) {
        logger.error(`Scheduler: Error calling Vehicles Service: ${error.message}`);
    }
};

const startScheduler = () => {
    if (schedulerInterval) clearInterval(schedulerInterval);
    schedulerInterval = setInterval(makeRequests, SCHEDULER_INTERVAL);
    logger.info(`Scheduler started with interval ${SCHEDULER_INTERVAL}ms`);
};

startScheduler();

app.post('/config/scheduler', express.json(), (req: Request, res: Response) => {
    const { interval } = req.body;
    if (interval && typeof interval === 'number') {
        if (schedulerInterval) clearInterval(schedulerInterval);
        schedulerInterval = setInterval(makeRequests, interval);
        logger.info(`Scheduler updated to interval ${interval}ms`);
        res.send({ status: 'updated', interval });
    } else {
        res.status(400).send({ error: 'Invalid interval' });
    }
});

app.listen(PORT, () => {
    logger.info(`Platform Service listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
    sdk.shutdown()
        .then(() => console.log('OpenTelemetry SDK terminated'))
        .catch((error) => console.log('Error terminating SDK', error))
        .finally(() => process.exit(0));
});
