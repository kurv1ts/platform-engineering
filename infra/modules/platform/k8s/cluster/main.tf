
terraform {
  required_providers {
    kind       = { source = "tehcyx/kind" }
    kubernetes = { source = "hashicorp/kubernetes" }
  }
}


resource "kind_cluster" "company_x_cluster" {
  name            = "${var.company_name}-cluster-${var.env}"
  node_image      = "kindest/node:v1.34.0"
  kubeconfig_path = pathexpand("~/.kube/${var.company_name}-cluster-${var.env}-kubeconfig")
  wait_for_ready  = true

  create_kms_key = true

  encryption_config = {
    resources = ["secrets"]
  }

  enabled_log_types = [
    "api",               # Kubernetes API server requests
    "audit",             # Audit logs for security and compliance
    "authenticator",     # Authentication-related logs
    "controllerManager", # Controller manager logs
    "scheduler",         # Scheduler decision logs
  ]

  kind_config {
    kind        = "Cluster"
    api_version = "kind.x-k8s.io/v1alpha4"

    node {
      role = "control-plane"

      extra_port_mappings {
        container_port = 80
        host_port      = 8880
      }

      extra_port_mappings {
        container_port = 443
        host_port      = 8843
      }
    }

    node {
      role = "worker"
    }
  }
}
