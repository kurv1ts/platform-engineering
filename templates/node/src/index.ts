import express, { NextFunction, Request, Response } from 'express';
import { getEnv } from './env/env';
import { logger } from './logger';
import { initTracing } from './observability';
import { httpRequestCounter, httpRequestDuration, register } from './metrics';

const ENV = getEnv();

const openTelemetry = initTracing();

const app = express();
const PORT = ENV.PORT;

app.use(express.json());

app.get("/metrics", async (_req: Request, res: Response) => {
  res.setHeader("Content-type", register.contentType);
  res.send(await register.metrics());
});

// Middleware to track requests and duration
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/metrics') return next();

  const startTime = Date.now();
  logger.info(`Received request to ${req.method}:${req.path} at ${new Date(startTime).toISOString()}`);
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    httpRequestCounter.inc({
      method: req.method,
      route: req.path,
      status: res.statusCode.toString(),
    });

    httpRequestDuration.observe({
      method: req.method,
      route: req.path,
      status: res.statusCode.toString()
    },
      duration
    );

  });

  next();
});



// --- Endpoints ---
app.get('/health', (req: Request, res: Response) => {
  /*
    Disable caching/ETags for /health so it always returns 200 (no 304 from conditional GETs)
  */
  res.set('Cache-Control', 'no-store');
  res.status(200).send('OK');
});

const server = app.listen(PORT, () => {
  logger.info(`${ENV.SERVICE_NAME} listening on port ${PORT}`);
});


const shutdown = async (signal: string) => {
  logger.warn(`Received ${signal}, starting graceful shutdown...`);
  const timeout = setTimeout(() => {
    logger.error("Forcing shutdown after timeout");
    process.exit(1);
  }, 30_000);
  timeout.unref();

  try {
    await new Promise<void>((resolve, reject) => server.close((err?: Error | undefined) => err ? reject(err) : resolve()));
    logger.warn("HTTP server closed");
  } catch (err) {
    logger.error("Error closing server", err);
    process.exitCode = 1;
  }

  openTelemetry.shutdown()
    .then(() => logger.info('OpenTelemetry SDK terminated'))
    .catch((error) => logger.error('Error terminating SDK', error))
    .finally(() => process.exit(0));
};

["SIGTERM", "SIGINT"].forEach(sig => process.once(sig, () => void shutdown(sig)));


