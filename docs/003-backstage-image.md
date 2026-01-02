## Backstage application image

The k8s cluster is built with kind (Kubernetes in Docker) and as the automated image building and pushing is not yet implemented, the image needs to be built and pushed manually to kind docker registry.


### Step1: Build the image

```
cd apps/backstage && docker build -t backstage:0.1.1 .
```


### Step2: Push the image to kind docker registry

```
docker save backstage:0.1.1 | docker exec -i company-x-cluster-dev-worker ctr -n k8s.io images import -
```

The image is saved to "company-x-cluster-dev-worker" worker node because it has a label "platform" and backstage deployment uses nodeSelector:platform.