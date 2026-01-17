# Internal Developer Platform

![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=flat&logo=kubernetes&logoColor=white)
![Terraform](https://img.shields.io/badge/Terraform-7B42BC?style=flat&logo=terraform&logoColor=white)
![ArgoCD](https://img.shields.io/badge/ArgoCD-EF7B4D?style=flat&logo=argo&logoColor=white)
![Backstage](https://img.shields.io/badge/Backstage-9BF0E1?style=flat&logo=backstage&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)

> A learning-focused Internal Developer Platform built to explore how Backstage + GitOps can reduce service onboarding time and enforce platform standards without custom per-team setup.

### What problem does it solve?
IDP aims to hide the infrastructure complexity from software 
engineers by providing a self service layer for building, 
deploying and managing applications. This allows software 
engineers
to focus on creating value for businesses by reducing 
cognitive load and offering consistent infrastructure & 
deployments.

## High-Level Flow 

[![](https://mermaid.ink/img/pako:eNqNUl1vmzAU_StXfmq1pE1DSQiaKnWNtE6dqqqJNGmhDw6-ECtgW9emWxr632cgZG21hwkBPpd7zv047FmqBbKYZYX-lW44OVjOEwUwx-eVv7HQBukJhsMr-MLTrXU8x9U35ZAUL-CYAQ8Fd5mm8ilRzQVgq3VO3GzgLrKrhN1Va09BhxbSorKeDyd3UonThD016QBCEqZOagXfH7tIr3nvW_QSPQTl8ec1nV9dU65v5vAJro0pZMob9gJd-21JHDO5BalyQmuPZX5o2haaC3tQPeK_souUZ5kuBAqwSM8y7cL3vERreIon9jQGgc_nhrRohRtpVKI7HPfUbq1eYOHnAoel8QNgDb38otPuSB-Cqx73HXQW1I-Yy3Z5fWPna7q6IfTCQGi0lU7Tro3Cgw9wQt-pKfSuROUg1SqTOdTwVbrbar3qXi2zXc8B-1L1UhuZxiCFGZZc-WlE_c6QJv0tbkldJ_atH_X7jf-TttipFHwVmaF19n8Yt9q64Zpbb9HB4A8sNmA5ScFiRxUOWIlU8gayfaOXMLfBEhMW-6PgtE1Yol49x3D1U-uyp5Gu8g2LM15Yjyoj_HRzyf2PXR6j5I1HutGVciy-uAhnrQqL9-w3i8ej6CwIJ0EYTKcX48tgEg3YzqcFZ9E0HEWj2WU4GwVRNHkdsJe28OhsdjkdjyfheBrMZv4Zvv4BMFhBDg?type=png)](https://mermaid.live/edit#pako:eNqNUl1vmzAU_StXfmq1pE1DSQiaKnWNtE6dqqqJNGmhDw6-ECtgW9emWxr632cgZG21hwkBPpd7zv047FmqBbKYZYX-lW44OVjOEwUwx-eVv7HQBukJhsMr-MLTrXU8x9U35ZAUL-CYAQ8Fd5mm8ilRzQVgq3VO3GzgLrKrhN1Va09BhxbSorKeDyd3UonThD016QBCEqZOagXfH7tIr3nvW_QSPQTl8ec1nV9dU65v5vAJro0pZMob9gJd-21JHDO5BalyQmuPZX5o2haaC3tQPeK_souUZ5kuBAqwSM8y7cL3vERreIon9jQGgc_nhrRohRtpVKI7HPfUbq1eYOHnAoel8QNgDb38otPuSB-Cqx73HXQW1I-Yy3Z5fWPna7q6IfTCQGi0lU7Tro3Cgw9wQt-pKfSuROUg1SqTOdTwVbrbar3qXi2zXc8B-1L1UhuZxiCFGZZc-WlE_c6QJv0tbkldJ_atH_X7jf-TttipFHwVmaF19n8Yt9q64Zpbb9HB4A8sNmA5ScFiRxUOWIlU8gayfaOXMLfBEhMW-6PgtE1Yol49x3D1U-uyp5Gu8g2LM15Yjyoj_HRzyf2PXR6j5I1HutGVciy-uAhnrQqL9-w3i8ej6CwIJ0EYTKcX48tgEg3YzqcFZ9E0HEWj2WU4GwVRNHkdsJe28OhsdjkdjyfheBrMZv4Zvv4BMFhBDg)

For the detailed design and local access patterns (hosts/port-forwarding), see [`docs/001-architecture-overview.md`](docs/001-architecture-overview.md).

## Repository Structure

```
platform-engineering/
├── apps/                    # Platform-managed applications
│   └── backstage/          # IDP portal with custom plugins
├── docs/                   # Architecture decisions & setup guides
├── gitops/                 # ArgoCD applications and configurations
│   ├── argo/              # Root app, projects, ApplicationSets
│   ├── apps/              # Platform controlled apps
│   ├── clusters/          # Cluster-specific configurations
    └── platform/          # Platform controlled resources without runtime,e.g admission policies, namespaces
├── infra/                  # Terraform infrastructure code
│   ├── modules/           # Reusable modules (k8s)
│   └── envs/              # Environment configurations
└── templates/              # Service templates for scaffolding
    └── node/              # Node.js service template
```
## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Portal** | Backstage | Self-service UI, software catalog, scaffolding |
| **GitOps** | ArgoCD | Declarative deployments, drift detection |
| **Infrastructure** | Terraform + Kind | Local K8s cluster provisioning |
| **Ingress** | Traefik | Traffic routing, TLS termination |
| **Secrets** | Sealed Secrets | GitOps-compatible secret management |
| **Observability** | Prometheus Operator, Grafana | Metrics collection, visualization |
| **Config Management** | Kustomize | Environment-specific overlays |

## What I Built

### Custom Backstage Scaffolder Action
Extended Backstage with a custom scaffolder action that prepares environment (env vars/secrets etc.) for the scaffolded service repository.

#### Authentication for Backstage
Backstage UI sign-in uses GitHub OAuth (OAuth2) so users and groups map cleanly to GitHub identities, which then drives ownership in the catalog and template permissions.

- Provider config: [`apps/backstage/app-config.production.yaml`](apps/backstage/app-config.production.yaml)
- Local override (gitignored): `apps/backstage/app-config.local.yaml`
- Kubernetes secrets (GitOps): [`gitops/apps/platform/backstage/overlays/dev/backstage-sealedsecrets.yaml`](gitops/apps/platform/backstage/overlays/dev/backstage-sealedsecrets.yaml)

**Expected secrets/vars (high level):** `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` for login; `GITHUB_TOKEN` for Backstage GitHub integration (scaffolder publishing + the `catalog-info.yaml` commit action).

Instead of a PAT-style `GITHUB_TOKEN`, a GitHub App is a better production choice due to scoped permissions and stronger auditability. If `GITHUB_TOKEN` is a PAT, it should be rotated regularly. This project uses `GITHUB_TOKEN` for simplicity.

**Key file:** [`apps/backstage/plugins/scaffolder-backend-module-custom-actions/`](apps/backstage/plugins/scaffolder-backend-module-custom-actions/)

### GitOps with App-of-Apps Pattern
Implemented a hierarchical ArgoCD structure with separate projects for `bootstrap`, `platform`, and `workloads`. This was chosen over a single-project setup to make trust boundaries explicit, even at small scale — it's easier to relax constraints later than to introduce them.

**Key file:** [`gitops/argo/root-application.yaml`](gitops/argo/root-application.yaml)

### Auto-Discovery of New Services

#### Currently
Hardcoded repository url is in the responsible applicationSet because for auto-discovery, Github SCM generator needs to be used which requires Github Org and relocation of this project.

#### Ideally
ApplicationSet with SCM Provider generator automatically discovers repositories tagged with `idp-managed` and deploys them without manual ArgoCD configuration. The tradeoff: this couples deploy decisions to GitHub topics, which wouldn't scale to a multi-org setup. Good enough for now.

**Key file:** [`gitops/argo/applicationSets/workloads/discovered-apps.yaml`](gitops/argo/applicationSets/workloads/discovered-apps.yaml)

### Observability-First Service Templates
Node.js service template with OpenTelemetry auto-instrumentation, Prometheus metrics, and structured JSON logging baked in. The alternative was letting teams add observability themselves, but that leads to inconsistent instrumentation and gaps when debugging cross-service issues.

**Key file:** [`templates/node/`](templates/node/)

### Chaos Engineering Capabilities
Demo services include configurable error rates and latency injection for testing resilience and observability pipelines. These aren't production patterns — they exist to generate interesting telemetry data for testing the observability stack.

**Key file:** [`apps/rental/src/index.ts`](apps/rental/src/index.ts)


## Getting Started

> **Prerequisites:** Docker, Terraform, kubectl, ArgoCD CLI

### 1. Provision Infrastructure
```bash
cd infra/envs/dev
terraform init && terraform apply
```
To use kubectl on Kind cluster run
```
export KUBECONFIG=~/.kube/company-x-cluster-dev-kubeconfig
```

### 2. Bootstrap ArgoCD
See [docs/002-argocd-bootstrap.md](docs/002-argocd-bootstrap.md) for detailed steps.

### 3. Deploy Backstage
Prerequisite: Github environment "dev" with `DOCKER_USERNAME` and `DOCKER_TOKEN` variables set.
Backstage has a CI workflow that builds, pushes to Docker Hub, and updates the GitOps manifests automatically:

```bash
# Trigger via GitHub Actions UI or CLI
gh workflow run backstage-ci.yaml -f environment=dev
```

ArgoCD detects the updated image tag in `gitops/apps/platform/backstage/overlays/dev/kustomization.yaml` and syncs the deployment.

**For local Kind clusters** (no registry access), load the image manually:
```bash
cd apps/backstage
docker build . -t backstage:0.0.1
docker save backstage:0.0.1 | docker exec -i company-x-cluster-dev-worker ctr -n k8s.io images import -
```

## TODO

| Component |
|-----------|
| NetworkPolicies |
| ResourceQuota |
| Ingress -> Gateway API |
| Logs & Traces |


## Documentation

[More detailed documentation](docs) 

## Notes

This project intentionally avoids over-engineering. It runs on a single Kind cluster, uses opinionated defaults, and optimizes for clarity over flexibility. The goal is to understand platform tradeoffs firsthand, not to simulate enterprise scale.

Things I deliberately left out (for now):
- Multi-cluster federation (adds complexity before it's needed)
- Vault for secrets (Sealed Secrets is good enough for learning GitOps patterns)

What I learned building this:
- **GitOps is great until it isn't** — debugging sync failures requires understanding both Git state and cluster state
("ArgoCD shows OutOfSync because the Git repo is correct, but the cluster is missing a CRD (SealedSecrets). You have to check both the Git manifests and what’s actually installed in the cluster.")
- **Templates are opinions** — every default you bake in is a decision someone will want to override
(The Node template sets default CPU/memory limits and a specific logging format. A team running a batch job or high‑throughput API will want to override those defaults.)

*This is a learning project. It works, but it's not production-hardened. Feedback is welcomed.*
