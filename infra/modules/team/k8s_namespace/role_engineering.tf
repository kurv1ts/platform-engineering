terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 3.0.0"
    }
  }
}

resource "kubernetes_cluster_role_v1" "engineering_role" {
  count = var.create_engineering_rbac ? 1 : 0
  rule {
    api_groups = [""]
    resources  = ["services","pods", "pods/log", "configmaps", "secrets"]
    verbs      = ["get", "list", "watch", "create", "update", "delete"]
  }

  rule {
    api_groups = ["apps"]
    resources  = ["deployments"]
    verbs      = ["get", "list", "watch", "create", "update", "delete"]
  }

  metadata {
    name      = local.engineering_group_name
  }
}

resource "kubernetes_role_binding_v1" "engineering_role_binding" {
  count = var.create_engineering_rbac ? 1 : 0
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = "edit"
  }

  subject {
    kind      = "Group"
    name      = local.engineering_group_name
  }

  metadata {
    name      = "${local.engineering_group_name}-edit"
    namespace = kubernetes_namespace_v1.this.metadata[0].name
  }
}
