# Mini Internal Developer Platform – Implementation Plan

## 0. Goals & Scope

- Goal: Build a **mini Internal Developer Platform (IDP)** that:
  - Provisions services on **AWS ECS** (via Terraform + LocalStack).
  - Uses **GitHub Actions** for CI/CD.
  - Uses **Prometheus + Grafana** for observability.
  - Provides a **portal with its own DB** as a service catalog + self-service interface.

- The aim is to demonstrate:
  - **infra automation**
  - **standardization of services** (golden path templates).
  - **productisation platform** (portal + API, not just scripts).

---

## 1. High-Level Architecture

- Components:
  - **Infra layer**  
    - Terraform (infra-as-code) targeting AWS APIs via LocalStack (local AWS emulator).
  - **Runtime layer**  
    - ECS cluster + services (Docker containers).
    - ALB (Application Load Balancer) for HTTP routing.
  - **CI/CD layer**  
    - GitHub Actions workflows for build, test, scan, deploy.
  - **Observability layer**  
    - Prometheus (metrics collection).
    - Grafana (dashboards).
  - **Platform portal**  
    - Web app
    - DB
    - Service catalog +“create service flow.

---

## 2. Repos & Project Structure
- **Monorepo structure:**
  - `/infra` – Terraform for ECS, networking, etc.
  - `/platform-portal` – Portal backend + frontend + DB migrations.
  - `/service-templates` – App templates for new services.
    - `/service-templates/node-api`
  - `/observability` – Prometheus + Grafana configs (Docker Compose or Terraform).
  - `/docs` – Diagrams, architecture, demo script.

---

## 3. Phase 1 – Infra: Terraform + LocalStack + ECS

### 3.1 Setup LocalStack + Terraform

- Tasks:
  - Add `docker-compose.yml` with:
    - LocalStack (emulated AWS).
    - Optional local Postgres for portal.
  - Configure Terraform provider:
    - `aws` provider pointing to LocalStack endpoints.
    - Make region/profile configurable.

- Deliverables:
  - `infra/main.tf` + provider setup.
  - `README` section: how to start LocalStack and apply Terraform.

---

### 3.2 Network + ECS Cluster

- Tasks:
  - Terraform resources:
    - VPC, subnets (public/private).
    - Security groups (HTTP in, ECS tasks out).
    - ECS cluster definition.
  - Optional: Fargate-like setup (even if partially emulated by LocalStack).

- Deliverables:
  - `infra/network.tf`
  - `infra/ecs_cluster.tf`

---

### 3.3 Load Balancer + Example ECS Service

- Tasks:
  - Create ALB (Application Load Balancer) + target group + listener.
  - Define ECS task definition for a simple container.
  - Define ECS service:
    - Attach to target group.
    - Desired count = 1. //Add scaling later

- Deliverables:
  - `infra/alb.tf`
  - `infra/example_service.tf`
  - Example Dockerized app in `/service-templates/example-api`.
  - Start with **one working service**, then generalize into templates.

---

## 4. Phase 2 – Service Template (Golden Path)

### 4.1 Minimal App Template

- Tasks:
  - Create `node-api` template with:
    - HTTP server.
    - `/health` endpoint (for ALB health checks).
    - `/metrics` endpoint (Prometheus text format).
    - Structured logging (JSON logs or key-value logs).

- Files:
  - `service-templates/node-api/Dockerfile`
  - `service-templates/node-api/src/index.ts`
  - `service-templates/node-api/README.md`

- First principles:
  - Template encodes **non-negotiable standards** (health, metrics, logging).

---

### 4.2 ECS Task Definition Template

- Tasks:
  - Create a **task definition template**
  - Parameters:
    - Service name.
    - Image URI.
    - Port.
    - Environment variables.
    - Anything else?

- Deliverables:
  - `infra/modules/service/` (Terraform module for ECS service).
  - Document how a new service instance uses this module.

---

## 5. Phase 3 – CI/CD with GitHub Actions

### 5.1 Build & Test Workflow

- Tasks:
  - Create `.github/workflows/service-ci.yml` template:
    - Trigger: `push` / `pull_request`.
    - Steps:
      - Checkout code
      - Install deps
      - Run tests

- Deliverables:
  - `service-templates/node-api/.github/workflows/ci.yml`

---

### 5.2 Build & Deploy Workflow

- Tasks:
  - Extend CI or create `cd.yml`:
    - Build Docker image.
    - Trivy vuln scan
    - Tag image (`service-name:commit-sha`).
    - Push to registry equivalent.
    - Register new ECS task definition (AWS CLI/Terraform apply).
    - Update ECS service to use new task definition.

- Notes:
  - CI/CD should be **reusable**

- Deliverables:
  - `service-templates/node-api/.github/workflows/cd.yml`
  - A top-level doc: “Deployment Flow”.

---

## 6. Phase 4 – Observability (Prometheus + Grafana)

### 6.1 Local Prometheus + Grafana Stack

- Tasks:
  - Add Prometheus + Grafana to `docker-compose.yml` or separate compose.
  - Should run as sidecar?

- Deliverables:
  - `observability/prometheus.yml`
  - `observability/docker-compose.yml` (if separate)
  - `observability/grafana-provisioning/` (data sources, dashboards)

---

### 6.2 Dashboards

- Tasks:
  - Create at least:
    - One **per-service dashboard** (HTTP rate, latency, error rate).
    - One **platform dashboard** (all services, basic health).

- Deliverables:
  - `observability/dashboards/service.json`
  - `observability/dashboards/platform.json`

---

## 7. Phase 5 – Platform Portal (Service Catalog)

### 7.1 Portal Backend & DB

- Tasks:
  - Setup DB
  - Define schema:
    - `services` (id, name, repo_url, runtime, created_at, created_by).
    - `environments` (id, name, base_url).
    - `service_environments` (service_id, environment_id, ecs_cluster, ecs_service_name, status, last_deploy_at).
    - `observability_links` (service_id, grafana_dashboard_url, logs_url).

---

### 7.2 Portal UI

- Tasks:
  - Pages:
    - `/services` – list of all services.
    - `/services/:id` – details page:
      - Repo URL.
      - Environments + URLs.
      - Grafana links.
    - `/services/new` – form to create new service.

Portal is the **product interface** of the platform.

---

## 8. Phase 6 – Service Creation Flow (Self-Service)

### 8.1 Integration with GitHub API

- Tasks:
  - From portal backend:
    - Call GitHub API to:
      - Create a new repo from a template OR
      - Create repo, then push initial template content (if you script it).
    - Add CI/CD workflows to the repo (copy from `/service-templates`).

---

### 8.2 Registering New Services in Portal DB

- Tasks:
  - When “Create Service” form is submitted:
    - Validate inputs.
    - Create repo on GitHub.
    - Insert `service` row in DB.
    - Insert `service_environments` rows (e.g. dev only initially).
    - Pre-generate Grafana dashboard URL pattern and store in `observability_links`.

- Deliverables:
  - Endpoint: `POST /api/services`.
  - UI flow: success redirect to `/services/:id`.

Creation flow should be **single entrypoint** for new services.

---

### 8.3 Linking to Deployment & Observability

  - Add “Deploy” button in portal that:
  - Triggers GitHub Actions workflow dispatch (via API).

- Deliverables:
  - Button on service detail page
  - Status feedback

---

## 9. Phase 7 – Hardening, Docs, and Demo

### 9.1 Security & Config (Basic)

- Tasks:
  - Use env vars for:
    - GitHub token.
    - DB credentials.
  - Later: move to a secrets solution (Vault, SOPS, or similar).

---

### 9.2 Documentation

- Tasks:
  - Top-level `README.md`:
    - Problem and motivation
    - Architecture diagram (img in `/docs`).
    - How to run locally
---

## 10. Checklist View

- [ ] LocalStack + Terraform basic infra.
- [ ] ECS cluster + ALB + example service.
- [ ] Service template (app, Dockerfile, health, metrics, logging).
- [ ] GitHub Actions CI/CD pipeline template.
- [ ] Prometheus + Grafana running and scraping example service.
- [ ] Portal backend + DB schema.
- [ ] Portal UI: list + details + create service.
- [ ] GitHub API integration for service creation.
- [ ] Portal to observability links wired.
- [ ] Docs + demo script + diagrams.

