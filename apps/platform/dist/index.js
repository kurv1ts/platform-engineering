"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const winston_1 = __importDefault(require("winston"));
const prom_client_1 = __importDefault(require("prom-client"));
const axios_1 = __importDefault(require("axios"));
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
// --- Tracing Setup ---
const sdk = new sdk_node_1.NodeSDK({
    resource: (0, resources_1.resourceFromAttributes)({
        [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: 'platform-service',
    }),
    traceExporter: new sdk_trace_base_1.ConsoleSpanExporter(),
    instrumentations: [(0, auto_instrumentations_node_1.getNodeAutoInstrumentations)()],
});
sdk.start();
// --- Logger Setup ---
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.json(),
    defaultMeta: { service: 'platform-service' },
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.simple(),
        }),
    ],
});
// --- Metrics Setup ---
const collectDefaultMetrics = prom_client_1.default.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'platform_' });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Configurable URLs
const RENTAL_SERVICE_URL = process.env.RENTAL_SERVICE_URL || 'http://localhost:3001';
const VEHICLES_SERVICE_URL = process.env.VEHICLES_SERVICE_URL || 'http://localhost:3002';
// --- Endpoints ---
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', prom_client_1.default.register.contentType);
        res.end(await prom_client_1.default.register.metrics());
    }
    catch (ex) {
        res.status(500).end(ex);
    }
});
// --- Scheduler ---
const SCHEDULER_INTERVAL = parseInt(process.env.SCHEDULER_INTERVAL || '5000', 10);
let schedulerInterval = null;
const makeRequests = async () => {
    logger.info('Scheduler: Making requests to downstream services...');
    // Request to Rental Service
    try {
        const vehicleId = Math.floor(Math.random() * 100);
        await axios_1.default.get(`${RENTAL_SERVICE_URL}/history/${vehicleId}`);
        logger.info(`Scheduler: Successfully called Rental Service history for ${vehicleId}`);
    }
    catch (error) {
        logger.error(`Scheduler: Error calling Rental Service: ${error.message}`);
    }
    // Request to Vehicles Service
    try {
        const vehicleId = Math.floor(Math.random() * 100);
        await axios_1.default.get(`${VEHICLES_SERVICE_URL}/vehicles/${vehicleId}`);
        logger.info(`Scheduler: Successfully called Vehicles Service details for ${vehicleId}`);
    }
    catch (error) {
        logger.error(`Scheduler: Error calling Vehicles Service: ${error.message}`);
    }
};
const startScheduler = () => {
    if (schedulerInterval)
        clearInterval(schedulerInterval);
    schedulerInterval = setInterval(makeRequests, SCHEDULER_INTERVAL);
    logger.info(`Scheduler started with interval ${SCHEDULER_INTERVAL}ms`);
};
startScheduler();
app.post('/config/scheduler', express_1.default.json(), (req, res) => {
    const { interval } = req.body;
    if (interval && typeof interval === 'number') {
        if (schedulerInterval)
            clearInterval(schedulerInterval);
        schedulerInterval = setInterval(makeRequests, interval);
        logger.info(`Scheduler updated to interval ${interval}ms`);
        res.send({ status: 'updated', interval });
    }
    else {
        res.status(400).send({ error: 'Invalid interval' });
    }
});
app.listen(PORT, () => {
    logger.info(`Platform Service listening on port ${PORT}`);
});
process.on('SIGTERM', () => {
    sdk.shutdown()
        .then(() => console.log('Tracing terminated'))
        .catch((error) => console.log('Error terminating tracing', error))
        .finally(() => process.exit(0));
});
