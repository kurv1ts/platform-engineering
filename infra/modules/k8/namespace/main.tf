
terraform {
  required_providers {
    kubernetes = { source = "hashicorp/kubernetes" }
  }
}

resource "kubernetes_namespace_v1" "platform" {
  metadata {
    name = "${var.name}-${var.env}"
  }
}