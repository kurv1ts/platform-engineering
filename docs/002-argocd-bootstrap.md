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


### Step 3: Create root application (App of Apps)
If you're reading this, the repository is public and you dont need the next step (3.1).
### Step 3.1: Add GitOps repository
```
argocd repo add git@github.com:kurv1ts/platform-engineering.git --ssh-private-key-path <path to private key that can access repository>
```

### Step 3.2: Create root application
```
kubectl apply -f gitops/argo/root-application.yaml
```

### Step 4: ArgoCD Login
Get initial password from secret:
```
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```
Login & Change the password:
```
argocd login localhost:8080 --username admin --password <password>
argocd account update-password
```