terraform {
  required_providers {
    kubernetes = { source = "hashicorp/kubernetes" }
  }
}

resource "kubernetes_namespace_v1" "this" {
  metadata {
    name = local.namespace_name

    labels = merge(
      {
        "team" = var.team_name
        "env"  = var.env
      },
      var.namespace_labels,
    )

    annotations = var.namespace_annotations
  }
}
