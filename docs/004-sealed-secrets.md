# Sealed Secrets

This project uses Sealed Secrets to encrypt sensitive data, allowing it to be safely stored in Git.
#### Alternatives
For a higher level of security and dynamic rotation, the industry standard is a dedicated manager like HashiCorp Vault or AWS Secrets Manager. Sealed Secrets is used here for its simplicity and GitOps compatibility.

## What are Sealed Secrets?

Sealed Secrets is a Kubernetes operator that allows you to encrypt secrets and store them in a Git repository. 

## How to use Sealed Secrets?

### Step 1

Create a standard secrets.yaml file in the base directory of the app and run the following command to encrypt it:
```
kubeseal --controller-name=sealed-secrets --controller-namespace=sealed-secrets < secrets.yaml > sealed-secrets.yaml
```

### Step 2

Add only the sealed-secrets.yaml file to the Git repository and push the changes.

## Notes

In production, the manual use of kubeseal is replaced by "paved paths". The platform team provides the public certificate, and the sealing process is integrated into CI/CD pipelines or self-service portals to ensure consistency and security across the organization