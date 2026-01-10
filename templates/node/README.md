# Node service template

Lean Express service with observability baked in.


- Health and metrics endpoints (`/health`, `/metrics` via prom-client histogram/counter)
- OpenTelemetry auto-instrumentation with console span exporter
- JSON logging with winston, enriched with trace/span IDs
- Env parsing/validation via zod + dotenv (`SERVICE_NAME`, `PORT`, `METRICS_PREFIX`, `ENV`)
- TypeScript build (`yarn build` -> `dist/`), runtime entry at `dist/index.js`

## Base image
- Multi-stage build from `node:24-alpine3.21`
- Installs deps with Yarn, builds TypeScript, copies `dist` + production `node_modules`
- Runs as non-root `appuser` (UID/GID 1111) in `/app`
- Default command: `yarn start`

## Local usage
- `yarn install`
- `yarn dev` for live reload or `yarn build && yarn start` to run the compiled app`

### Deployments
- To deploy a new version of the application, build a new application image by running `build-push-image.yaml` Github Action.
- Changes are picked up by ArgoCD and deployed automatically.