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
    [SemanticResourceAttributes.SERVICE_NAME]: 'rental-service',
  }),
  traceExporter: new ConsoleSpanExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

openTelemetry.start();

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

// --- Metrics Setup ---
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'rental_' });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

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

// --- In-Memory State ---
interface Rental {
  startTime: Date;
  endTime?: Date;
}

const rentals: Record<string, Rental> = {}; // vehicleId -> { startTime, endTime, ... }
const history: Record<string, Rental[]> = {}; // vehicleId -> [ { start, end } ]

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
  openTelemetry.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});
