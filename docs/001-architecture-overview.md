# Architecture Overview


## Design Philosophy

The platform is built around three core principles:

1. **Self-Service**: Developers should be able to create and deploy services without filing tickets or handling infrastructure themselves
2. **Golden Paths**: Provide opinionated templates that encode best practices
3. **GitOps**: All changes flow through Git, providing audit trails and easy rollbacks



## The Golden Path

When a developer creates a new service, here's what happens:

### Step 1: Self-Service Request
Developer visits Backstage and fills out a form selecting:
- Service name
- Owning team
- Template type (Node.js v24)

### Step 2: Repository Scaffolding
Backstage executes the template which:
1. Creates a new GitHub repository from the template, adds topic `idp-managed` to the repository
2. Runs custom action to generate `catalog-info.yaml`
3. Registers the component in Backstage's software catalog
4. Notifies the developer

### Step 3: Automatic Deployment
The ApplicationSet's SCM Provider generator:
1. Scans GitHub for repositories with `idp-managed` topic
2. Detects the new repository
3. Creates an ArgoCD Application automatically
4. ArgoCD syncs the deployment manifests to the cluster

### Step 4: Result
The service is deployed with:
- OpenTelemetry auto-instrumentation
- Prometheus metrics endpoint
- Structured JSON logging
- Health check endpoints
- Proper resource limits

## Component Deep Dive

### Backstage (Portal Layer)

**Why Backstage?**
- Industry-standard IDP framework backed by Spotify
- Extensible plugin architecture
- Software catalog for service discovery
- Built-in scaffolder for templates

**Custom Actions:**
- `template:catalog-info-handler` - Custom scaffolder action that commits template's metadata to new repos.

### ArgoCD (GitOps Layer)

**Why ArgoCD?**
- Declarative GitOps for Kubernetes
- Automatic drift detection and self-healing
- Clear visualization of deployment state
- Native Kubernetes integration

**Architecture Pattern: App-of-Apps**

The `root-app` bootstraps two things: AppProjects (policy boundaries) and ApplicationSets (application generators). Separate ApplicationSets for platform and workloads create ArgoCD Applications for platform components (Backstage, Traefik, Sealed Secrets etc.) and for workload apps (auto-discovered services). AppProjects control by policy what those Applications can deploy.

**Project Boundaries:**
| Project | Purpose | Source |
|---------|---------|--------|
| `bootstrap` | Root application only | Cluster admins |
| `platform` | Cluster infrastructure + Portal | Platform team |
| `workloads` | Application deployments | Development teams |

### Terraform (Infrastructure Layer)

**Why Terraform?**
- Industry standard for IaC
- Strong provider ecosystem
- State management and planning
- Modular and reusable

**Module Structure:**
```
infra/modules/
├── platform/
│   └── k8s/cluster/     # Kind cluster provisioning
```

### Sealed Secrets (Secret Management)

**Why Sealed Secrets?**
- Secrets can be safely stored in Git
- GitOps compatible
- No external secret store dependency

**Alternative Considered:** HashiCorp Vault
- More powerful but adds operational complexity
- Better for dynamic secrets and rotation
- Saved for future iteration

### Observability Stack

**Built into every service template:**

| Capability | Implementation |
|------------|----------------|
| Tracing | OpenTelemetry auto-instrumentation |
| Metrics | Prometheus client with histograms/counters |
| Logging | Winston with JSON format, trace correlation |

**Why baked-in?**
- Developers get observability without effort
- Consistent metrics across all services
- Trace correlation across service boundaries

## Network Architecture

[![](https://mermaid.ink/img/pako:eNqFUV1PwjAU_SvNfeaj-wC2xvAgPmg0SoDExM2HspVtYVtJ24EK_Hc7xgYG0ftwe257zr3t6RYCHjIgsEj5JoipUOhp4udIx0OumMiZ8mrwXu1XWRbzSNBVjIK0kPoceY9JHqJRVR2pZcwEZYtk6R1X3TYSTMozxgk1TVcpVQsuMuSNa_Q8PZOUcUuDpVQ0Yl6DEBlgPDjjsTz8c86Gi2XKaSiR93qEl4Om68Dwpkysk0BPGL9MZpcE8yqhuUIDftqL2u3hjjiOg7s629audqyi1baVrHsuFUHz-rWdlAc0vZmL7nBMVUxQd3cy5ZpaVtds09_U5Uv_E86vCE1oQSSSEIgSBWtBxkRGyxK2ZUsfVMwy5gPRMKRi6YOf77VmRfM3zrNaJngRxUAWNJW6KlYhVewuofq7ThTtJBMjXuQKtGWHFkC28AGkb3RME5uWZdmOjW3s9FvwCcR1O3hg9XuuaWiLsbFvwddhJu44hmlb2DV7ds92B_3e_huBC-73?type=png)](https://mermaid.live/edit#pako:eNqFUV1PwjAU_SvNfeaj-wC2xvAgPmg0SoDExM2HspVtYVtJ24EK_Hc7xgYG0ftwe257zr3t6RYCHjIgsEj5JoipUOhp4udIx0OumMiZ8mrwXu1XWRbzSNBVjIK0kPoceY9JHqJRVR2pZcwEZYtk6R1X3TYSTMozxgk1TVcpVQsuMuSNa_Q8PZOUcUuDpVQ0Yl6DEBlgPDjjsTz8c86Gi2XKaSiR93qEl4Om68Dwpkysk0BPGL9MZpcE8yqhuUIDftqL2u3hjjiOg7s629audqyi1baVrHsuFUHz-rWdlAc0vZmL7nBMVUxQd3cy5ZpaVtds09_U5Uv_E86vCE1oQSSSEIgSBWtBxkRGyxK2ZUsfVMwy5gPRMKRi6YOf77VmRfM3zrNaJngRxUAWNJW6KlYhVewuofq7ThTtJBMjXuQKtGWHFkC28AGkb3RME5uWZdmOjW3s9FvwCcR1O3hg9XuuaWiLsbFvwddhJu44hmlb2DV7ds92B_3e_huBC-73)

**Port Mappings (Kind):**
- `8880` -> cluster port `80` (HTTP)
- `8843` -> cluster port `443` (HTTPS)

### Ingress routing
Routing is host-based (for example `backstage.local`) and uses path `/`, so `http://localhost:8880/backstage` will not match any ingress rule. Use `http://backstage.local:8880/` (with a hosts entry) or send the `Host: backstage.local` header when hitting `http://localhost:8880/`.

Traffic enters the cluster via Traefik. Ingress resources are defined in app "base" manifests, with environment-specific overrides (such as hostname and `ingressClassName`) applied via kustomize patches in overlays.

Simplest method to access Backstage UI is to port-forward the Backstage service directly: `kubectl -n backstage-dev port-forward svc/backstage 80:80`, then open `http://localhost`.

## Security Model

### Namespace Isolation
- Platform components run in `platform` namespace on dedicated node
- Workloads run in team namespaces on `workloads` node
- Node selectors enforce this separation

## Future Roadmap

| Feature | Priority |
|---------|----------|
| RBAC | High |
| NetworkPolicies | High |
| ResourceQuota | High |
| Gateway API | medium |
| Vault integration | Low |
...

## Related Documentation

- [ArgoCD Bootstrap](002-argocd-bootstrap.md) - Step-by-step ArgoCD setup
- [Backstage Image](003-backstage-image.md) - Building the Backstage container
- [Sealed Secrets](004-sealed-secrets.md) - Secret management workflow
- [Kubernetes Ingress](005-k8s-ingress.md) - Ingress controller and routing pattern

