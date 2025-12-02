"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const winston_1 = __importDefault(require("winston"));
const prom_client_1 = __importDefault(require("prom-client"));
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
// --- Tracing Setup ---
const sdk = new sdk_node_1.NodeSDK({
    resource: (0, resources_1.resourceFromAttributes)({
        [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: 'rental-service',
    }),
    traceExporter: new sdk_trace_base_1.ConsoleSpanExporter(),
    instrumentations: [(0, auto_instrumentations_node_1.getNodeAutoInstrumentations)()],
});
sdk.start();
// --- Logger Setup ---
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.json(),
    defaultMeta: { service: 'rental-service' },
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.simple(),
        }),
    ],
});
// --- Metrics Setup ---
const collectDefaultMetrics = prom_client_1.default.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'rental_' });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use(express_1.default.json());
let config = {
    errorRate: 0, // 0 to 1
    latencyMax: 0, // ms
};
// --- Chaos Middleware ---
app.use((req, res, next) => {
    // Skip chaos for config and metrics
    if (req.path === '/config' || req.path === '/metrics')
        return next();
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
    }
    else {
        // Random Error (no latency)
        if (Math.random() < config.errorRate) {
            logger.warn(`Chaos: Injected error for ${req.path}`);
            return res.status(500).send({ error: 'Chaos Monkey struck!' });
        }
        next();
    }
});
const rentals = {}; // vehicleId -> { startTime, endTime, ... }
const history = {}; // vehicleId -> [ { start, end } ]
// --- Endpoints ---
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', prom_client_1.default.register.contentType);
        res.end(await prom_client_1.default.register.metrics());
    }
    catch (ex) {
        res.status(500).end(ex);
    }
});
app.post('/config', (req, res) => {
    const { errorRate, latencyMax } = req.body;
    if (typeof errorRate === 'number')
        config.errorRate = errorRate;
    if (typeof latencyMax === 'number')
        config.latencyMax = latencyMax;
    logger.info(`Config updated: errorRate=${config.errorRate}, latencyMax=${config.latencyMax}`);
    res.send(config);
});
app.post('/start/:vehicleId', (req, res) => {
    const { vehicleId } = req.params;
    if (rentals[vehicleId]) {
        return res.status(400).send({ error: 'Vehicle already rented' });
    }
    rentals[vehicleId] = { startTime: new Date() };
    logger.info(`Vehicle ${vehicleId} rental started`);
    res.send({ status: 'started', vehicleId, startTime: rentals[vehicleId].startTime });
});
app.post('/end/:vehicleId', (req, res) => {
    const { vehicleId } = req.params;
    if (!rentals[vehicleId]) {
        return res.status(400).send({ error: 'Vehicle not currently rented' });
    }
    const rental = rentals[vehicleId];
    rental.endTime = new Date();
    if (!history[vehicleId])
        history[vehicleId] = [];
    history[vehicleId].push(rental);
    delete rentals[vehicleId];
    logger.info(`Vehicle ${vehicleId} rental ended`);
    res.send({ status: 'ended', vehicleId, startTime: rental.startTime, endTime: rental.endTime });
});
app.get('/history/:vehicleId', (req, res) => {
    const { vehicleId } = req.params;
    res.send(history[vehicleId] || []);
});
app.listen(PORT, () => {
    logger.info(`Rental Service listening on port ${PORT}`);
});
process.on('SIGTERM', () => {
    sdk.shutdown()
        .then(() => console.log('Tracing terminated'))
        .catch((error) => console.log('Error terminating tracing', error))
        .finally(() => process.exit(0));
});
