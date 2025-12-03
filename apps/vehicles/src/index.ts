import express, { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import * as api from '@opentelemetry/api';

// --- Metrics Setup (Prometheus Exporter) ---
const prometheusExporter = new PrometheusExporter({
    port: 9466,
}, () => {
    console.log('Prometheus scrape endpoint: http://localhost:9466/metrics');
});

// --- OpenTelemetry SDK with both Tracing and Metrics ---
const sdk = new NodeSDK({
    traceExporter: new ConsoleSpanExporter(),
    metricReader: prometheusExporter,
    instrumentations: [getNodeAutoInstrumentations()],
    serviceName: 'vehicles-service',
});

sdk.start();

// Get meter for custom metrics
const meter = api.metrics.getMeter('vehicles-service');

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
    defaultMeta: { service: 'vehicles-service' },
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
});

const app = express();
const PORT = process.env.PORT || 7002;

app.use(express.json());

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
    sdk.shutdown()
        .then(() => console.log('OpenTelemetry SDK terminated'))
        .catch((error) => console.log('Error terminating SDK', error))
        .finally(() => process.exit(0));
});
