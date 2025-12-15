terraform {
  required_providers {
    kubernetes = { source = "hashicorp/kubernetes" }
  }
}

resource "kubernetes_service_account_v1" "cicd_service_account" {
  count = var.create_cicd_service_account ? 1 : 0

  metadata {
    name      = local.cicd_service_account_name
    namespace = kubernetes_namespace_v1.this.metadata[0].name

    labels = {
      "team" = var.team_name
      "env"  = var.env
      "role" = "cicd"
    }
  }
}

resource "kubernetes_role_v1" "cicd_role" {
  count = var.create_cicd_service_account ? 1 : 0
  rule {
    api_groups = ["apps"]
    resources  = ["deployments"]
    verbs      = ["get", "list", "watch", "update", "create", "patch", "delete"]
  }
  rule {
    api_groups = [""]
    resources  = ["pods"]
    verbs      = ["get", "list", "watch"]
  }
  metadata {
    name      = local.cicd_service_account_name
    namespace = kubernetes_namespace_v1.this.metadata[0].name
  }
}

resource "kubernetes_role_binding_v1" "cicd_role_binding" {
  count = var.create_cicd_service_account ? 1 : 0
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role_v1.cicd_role[0].metadata[0].name
  }
  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account_v1.cicd_service_account[0].metadata[0].name
    namespace = kubernetes_namespace_v1.this.metadata[0].name
  }

  metadata {
    name      = local.cicd_service_account_name
    namespace = kubernetes_namespace_v1.this.metadata[0].name
  }
}
