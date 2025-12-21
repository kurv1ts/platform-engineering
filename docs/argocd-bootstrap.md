# ArgoCD Bootstrap

ArgoCD assumes existing infrastructure and does not create it. 

Argo CD is treated as control-plane tooling and is intentionally not managed by this GitOps repository. This avoids circular dependencies and keeps the GitOps payload clean and reusable.

### Step 1: ArgoCD Installation
```
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/v3.2.2/manifests/install.yaml
```

### Step 2: Create Argo CD projects (one-time)
Create security boundaries before any applications are registered.

```
kubectl apply -k argo/projects
```

bootstrap – root App-of-Apps
platform – cluster-level infrastructure
workloads – application workloads


