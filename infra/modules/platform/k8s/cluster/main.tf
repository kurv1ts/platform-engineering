
terraform {
  required_providers {
    kind       = { source = "tehcyx/kind" }
    kubernetes = { source = "hashicorp/kubernetes" }
  }
}


resource "kind_cluster" "this" {
  name            = "${var.company_name}-cluster"
  node_image      = "kindest/node:v1.34.0"
  kubeconfig_path = pathexpand("~/.kube/${var.company_name}-cluster-kubeconfig")
  wait_for_ready  = true

  kind_config {
    kind        = "Cluster"
    api_version = "kind.x-k8s.io/v1alpha4"

    node {
      role = "control-plane"
    }

    node {
      role = "worker"
      labels = {
        role = "platform"
      }

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
      labels = {
        role = "workloads"
      }
    }

  }
}
