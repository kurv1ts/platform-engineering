## Backstage application image

Image builds and promotion are automated via the [Backstage CI](.github/workflows/backstage-ci.yaml) GitHub Actions workflow.

Prerequisites:
- DOCKER_USERNAME
- DOCKER_TOKEN

as environment secrets in Github.


### Automated flow for **dev** deployment

Any merge to `main` that touches files under `apps/backstage/**` triggers the pipeline automatically:

1. **Build** - Docker image is built using Buildx with GitHub Actions layer caching
2. **Push** - Image is pushed to Docker Hub tagged as `<full-git-sha>`
3. **Promote** - A pull request is opened updating `gitops/apps/platform/backstage/overlays/dev/kustomization.yaml` with the new tag
4. **Deploy** - Merging the PR allows ArgoCD to detect the change and roll out the new image to the dev namespace.

### Manual promotion to **prod**

Run the `Backstage CI` workflow manually (`workflow_dispatch`), select `prod` as the environment and specify `commit SHA` that already exists in the image registry.
