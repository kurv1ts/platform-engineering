# Notes for myself

## Client (terraform provider / kubectl) to k8 cluster auth 
Uses mTLS

When Terraform connects to the API server:

1. Terraform -> API server:
- "I want to start https request"

2. API server -> Terraform:
- Sends its server certificate (signed by the cluster CA).
- Terraform uses cluster_ca_certificate to check:
    - "Was this server cert signed by my trusted CA?"
    - "Does the hostname match?"

3. Terraform -> API server (client auth part):
- Sends client_certificate + signs server sent challenge for handshake.

4. API server checks client:
- Verifies client cert is signed by a trusted CA.
- Maps cert subject/groups -> Kubernetes user/roles (RBAC decides what it can do).

Happy communicating.