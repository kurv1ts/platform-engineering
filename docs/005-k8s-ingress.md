# Kubernetes ingress

This project uses a standard Kubernetes `Ingress` resource for HTTP routing inside the cluster.

## Controller

- Ingress controller: Traefik (installed via ArgoCD/Helm)
- Environment-specific `ingressClassName`:
  - `traefik` (base default)
  - `traefik-dev` (Kind/dev override, used with a `ClusterIP` service)

## Pattern: base resource + overlay patch

To keep the "golden path" consistent across apps, ingress is defined in the **base** and environment differences are applied via a **kustomize patch** in the overlay:

- Base ingress: sensible defaults, no environment coupling (class `traefik`)
- Dev overlay: patch host + `ingressClassName` (class `traefik-dev`)

This mirrors the same pattern used for Backstage's ingress overlay.

## Local access (Kind)

The Kind cluster maps host ports to the control-plane container ports:

- `localhost:8880` -> cluster port `80` (HTTP)
- `localhost:8843` -> cluster port `443` (HTTPS)

Hostnames such as `*.local` are used for convenience; you can add entries to your hosts file pointing them at `127.0.0.1`.

## ArgoCD health check note (dev)

In dev, Traefik does not provision a LoadBalancer, so `Ingress` objects won't get a load balancer address. To avoid ArgoCD showing ingresses as perpetually "Progressing", the repo includes a custom ArgoCD health check for ingresses using `ingressClassName: traefik-dev`.

## Future: Gateway API

Ingress is intentionally kept simple here. A future iteration can move to Gateway API for richer routing and policy controls (for example, weighted routing and more expressive attachment points for auth/RBAC-like policies).
