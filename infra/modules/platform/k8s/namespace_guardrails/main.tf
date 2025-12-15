locals {
  namespace_name = "${var.name}-${var.env}"
}

resource "kubernetes_namespace_v1" "this" {
  metadata {
    # This module owns the namespace. Centralizing namespace creation is a practical way to ensure
    # baseline guardrails are always applied (RBAC can then restrict who is allowed to create namespaces).
    name = local.namespace_name

    labels = merge(
      {
        "env"  = var.env
        "name" = var.name
      },

      # Pod Security Admission (PSA) is built into Kubernetes (no extra tool required).
      # These labels tell the API server which security profile to enforce/audit/warn for pods in this namespace.
      {
        "pod-security.kubernetes.io/enforce"         = var.pod_security_standard
        "pod-security.kubernetes.io/enforce-version" = var.pod_security_version
        "pod-security.kubernetes.io/audit"           = var.pod_security_standard
        "pod-security.kubernetes.io/audit-version"   = var.pod_security_version
        "pod-security.kubernetes.io/warn"            = var.pod_security_standard
        "pod-security.kubernetes.io/warn-version"    = var.pod_security_version
      },

      var.labels,
    )

    annotations = var.annotations
  }
}

resource "kubernetes_resource_quota_v1" "this" {
  # ResourceQuota is enforced by the Kubernetes API server; it works regardless of CNI.
  count = var.enable_resource_quota ? 1 : 0

  metadata {
    name      = "resource-quota"
    namespace = kubernetes_namespace_v1.this.metadata[0].name
  }

  spec {
    hard = var.resource_quota_hard
  }
}

resource "kubernetes_limit_range_v1" "this" {
  # LimitRange can apply default requests/limits so workloads are less likely to starve the cluster.
  count = var.enable_limit_range ? 1 : 0

  metadata {
    name      = "limit-range"
    namespace = kubernetes_namespace_v1.this.metadata[0].name
  }

  spec {
    limit {
      type = "Container"

      default         = var.limit_range_container_defaults.default
      default_request = var.limit_range_container_defaults.default_request
      max             = var.limit_range_container_defaults.max
    }
  }
}

resource "kubernetes_network_policy_v1" "default_deny_ingress" {
  # NetworkPolicies are only enforced if your cluster uses a NetworkPolicy-capable CNI (Calico/Cilium/etc).
  # In some local clusters (including a default kind setup), NetworkPolicies may exist but not be enforced.
  count = var.enable_default_deny_ingress ? 1 : 0

  metadata {
    name      = "default-deny-ingress"
    namespace = kubernetes_namespace_v1.this.metadata[0].name
  }

  spec {
    pod_selector {}
    policy_types = ["Ingress"]
    # No ingress rules => deny all ingress by default.
  }
}

resource "kubernetes_network_policy_v1" "default_deny_egress" {
  count = var.enable_default_deny_egress ? 1 : 0

  metadata {
    name      = "default-deny-egress"
    namespace = kubernetes_namespace_v1.this.metadata[0].name
  }

  spec {
    pod_selector {}
    policy_types = ["Egress"]
    # No egress rules => deny all egress by default.
  }
}

resource "kubernetes_network_policy_v1" "allow_dns_egress" {
  # When egress is default-deny, DNS must be explicitly allowed or most apps won't be able to resolve names.
  # This policy allows traffic to CoreDNS/kube-dns in kube-system on TCP/UDP 53.
  count = var.enable_default_deny_egress && var.enable_allow_dns_egress ? 1 : 0

  metadata {
    name      = "allow-dns-egress"
    namespace = kubernetes_namespace_v1.this.metadata[0].name
  }

  spec {
    pod_selector {}
    policy_types = ["Egress"]

    egress {
      to {
        namespace_selector {
          match_labels = {
            # Kubernetes adds this label automatically to namespaces.
            "kubernetes.io/metadata.name" = "kube-system"
          }
        }

        pod_selector {
          match_labels = {
            # Works for kube-dns and (in many clusters) CoreDNS.
            "k8s-app" = "kube-dns"
          }
        }
      }

      ports {
        protocol = "UDP"
        port     = 53
      }

      ports {
        protocol = "TCP"
        port     = 53
      }
    }
  }
}
