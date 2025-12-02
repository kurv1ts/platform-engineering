import express, { Request, Response } from 'express';
import winston from 'winston';
import client from 'prom-client';
import axios from 'axios';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// --- Tracing Setup ---
const openTelemetry = new NodeSDK({
    resource: resourceFromAttributes({
        [SemanticResourceAttributes.SERVICE_NAME]: 'platform-service',
    }),
    traceExporter: new ConsoleSpanExporter(),
    instrumentations: [getNodeAutoInstrumentations()],
});

openTelemetry.start();

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

// --- Metrics Setup ---
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'platform_' });

const app = express();
const PORT = process.env.PORT || 3000;

// Configurable URLs
const RENTAL_SERVICE_URL = process.env.RENTAL_SERVICE_URL || 'http://localhost:3001';
const VEHICLES_SERVICE_URL = process.env.VEHICLES_SERVICE_URL || 'http://localhost:3002';

// --- Endpoints ---

app.get('/health', (req: Request, res: Response) => {
    res.status(200).send('OK');
});

app.get('/metrics', async (req: Request, res: Response) => {
    try {
        res.set('Content-Type', client.register.contentType);
        res.end(await client.register.metrics());
    } catch (ex) {
        res.status(500).end(ex);
    }
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
    openTelemetry.shutdown()
        .then(() => console.log('Tracing terminated'))
        .catch((error) => console.log('Error terminating tracing', error))
        .finally(() => process.exit(0));
});
