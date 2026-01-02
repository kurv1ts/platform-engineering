
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
      labels = {
        role = "platform"
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
