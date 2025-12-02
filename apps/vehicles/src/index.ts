import express, { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import client from 'prom-client';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// --- Tracing Setup ---
const openTelemetry = new NodeSDK({
    resource: resourceFromAttributes({
        [SemanticResourceAttributes.SERVICE_NAME]: 'vehicles-service',
    }),
    traceExporter: new ConsoleSpanExporter(),
    instrumentations: [getNodeAutoInstrumentations()],
});

openTelemetry.start();

// --- Logger Setup ---
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'vehicles-service' },
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
});

// --- Metrics Setup ---
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'vehicles_' });

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// --- Chaos Configuration ---
interface ChaosConfig {
    errorRate: number;
    latencyMax: number;
}

let config: ChaosConfig = {
    errorRate: 0.2, // 0 to 1
    latencyMax: 5000, // ms
};

// --- Chaos Middleware ---
app.use((req: Request, res: Response, next: NextFunction) => {
    // Skip chaos for config and metrics
    if (req.path === '/config' || req.path === '/metrics') return next();

    // Random Latency
    if (config.latencyMax > 0) {
        const latency = Math.floor(Math.random() * config.latencyMax);
        setTimeout(() => {
            // Random Error
            if (Math.random() < config.errorRate) {
                logger.warn(`Chaos: Injected error for ${req.path}`);
                return res.status(500).send({ error: 'Chaos Monkey struck!' });
            }
            next();
        }, latency);
    } else {
        // Random Error (no latency)
        if (Math.random() < config.errorRate) {
            logger.warn(`Chaos: Injected error for ${req.path}`);
            return res.status(500).send({ error: 'Chaos Monkey struck!' });
        }
        next();
    }
});

// --- In-Memory State ---
interface Vehicle {
    id: number;
    status: string;
    coordinates: {
        lat: number;
        lng: number;
    };
}

// Generate some dummy vehicles
const vehicles: Vehicle[] = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    status: Math.random() > 0.5 ? 'available' : 'rented',
    coordinates: {
        lat: 52.5200 + (Math.random() - 0.5) * 0.1,
        lng: 13.4050 + (Math.random() - 0.5) * 0.1,
    },
}));

// --- Endpoints ---

app.get('/metrics', async (req: Request, res: Response) => {
    try {
        res.set('Content-Type', client.register.contentType);
        res.end(await client.register.metrics());
    } catch (ex) {
        res.status(500).end(ex);
    }
});

app.post('/config', (req: Request, res: Response) => {
    const { errorRate, latencyMax } = req.body;
    if (typeof errorRate === 'number') config.errorRate = errorRate;
    if (typeof latencyMax === 'number') config.latencyMax = latencyMax;
    logger.info(`Config updated: errorRate=${config.errorRate}, latencyMax=${config.latencyMax}`);
    res.send(config);
});

app.get('/vehicles', (req: Request, res: Response) => {
    res.send(vehicles);
});

app.get('/vehicles/:vehicleId', (req: Request, res: Response) => {
    const { vehicleId } = req.params;
    const vehicle = vehicles.find(v => v.id == parseInt(vehicleId, 10));
    if (vehicle) {
        res.send(vehicle);
    } else {
        res.status(404).send({ error: 'Vehicle not found' });
    }
});

app.listen(PORT, () => {
    logger.info(`Vehicles Service listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
    openTelemetry.shutdown()
        .then(() => console.log('Tracing terminated'))
        .catch((error) => console.log('Error terminating tracing', error))
        .finally(() => process.exit(0));
});
