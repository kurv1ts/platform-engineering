import express, { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import * as api from '@opentelemetry/api';

// --- Metrics Setup (Prometheus Exporter) ---
const prometheusExporter = new PrometheusExporter({
  port: 9465,
}, () => {
  console.log('Prometheus scrape endpoint: http://localhost:9465/metrics');
});

// --- OpenTelemetry SDK with both Tracing and Metrics ---
const sdk = new NodeSDK({
  traceExporter: new ConsoleSpanExporter(),
  metricReader: prometheusExporter,
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: 'rental-service',
});

sdk.start();

// Get meter for custom metrics
const meter = api.metrics.getMeter('rental-service');

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
  defaultMeta: { service: 'rental-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

const app = express();
const PORT = process.env.PORT || 7001;

app.use(express.json());


// --- In-Memory State ---
interface Rental {
  startTime: Date;
  endTime?: Date;
}

const rentals: Record<string, Rental> = {}; // vehicleId -> { startTime, endTime, ... }
const history: Record<string, Rental[]> = {}; // vehicleId -> [ { start, end } ]

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
  errorRate: 0.1, // 0 to 1
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

app.post('/start/:vehicleId', (req: Request, res: Response) => {
  const { vehicleId } = req.params;
  if (rentals[vehicleId]) {
    return res.status(400).send({ error: 'Vehicle already rented' });
  }
  rentals[vehicleId] = { startTime: new Date() };
  logger.info(`Vehicle ${vehicleId} rental started`);
  res.send({ status: 'started', vehicleId, startTime: rentals[vehicleId].startTime });
});

app.post('/end/:vehicleId', (req: Request, res: Response) => {
  const { vehicleId } = req.params;
  if (!rentals[vehicleId]) {
    return res.status(400).send({ error: 'Vehicle not currently rented' });
  }
  const rental = rentals[vehicleId];
  rental.endTime = new Date();

  if (!history[vehicleId]) history[vehicleId] = [];
  history[vehicleId].push(rental);

  delete rentals[vehicleId];
  logger.info(`Vehicle ${vehicleId} rental ended`);
  res.send({ status: 'ended', vehicleId, startTime: rental.startTime, endTime: rental.endTime });
});

app.get('/history/:vehicleId', (req: Request, res: Response) => {
  const { vehicleId } = req.params;
  res.send(history[vehicleId] || []);
});

app.listen(PORT, () => {
  logger.info(`Rental Service listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('OpenTelemetry SDK terminated'))
    .catch((error) => console.log('Error terminating SDK', error))
    .finally(() => process.exit(0));
});
