# ArgoCD Bootstrap

ArgoCD assumes existing infrastructure and does not create it.

Argo CD is treated as control-plane tooling and is intentionally not managed by this GitOps repository. This avoids circular dependencies and keeps the GitOps payload clean and reusable.

## Install ArgoCD using Helm

### Step 1: ArgoCD Installation
```
helm repo add argo https://argoproj.github.io/argo-helm
helm install argocd argo/argo-cd --version 9.4.5 -n argocd --create-namespace
```

### Step 2: Bootstrap ArgoCD root application and projects
Create security boundaries before any applications are registered.

```
helm dependency update gitops/argo/config
helm install argocd-config gitops/argo/config -n argocd
```

* root – root App-of-Apps
* platform – platform controlled cluster-level infrastructure
* workloads – application workloads


### Step 3: ArgoCD Login
Get initial password from secret:
```
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

Login & Change the password via CLI or UI:
```
kubectl -n argocd port-forward svc/argocd-server 8080:80

argocd login localhost:8080 --username admin --password <password>
argocd account update-password
```

## Authentication
The current project operates with **public repositories** and does not need authentication between argoCD and github repositories.

When working with **private repositories**, Github Apps is the recommended authentication method. This allows communication using short term tokens for authentication. An alternative would be using SSH keys but the project aims to scaffold repositories for developers and each new repository would need SSH key management. This doesn't scale.
