output "cicd_service_account_name" {
  value = try(kubernetes_service_account_v1.cicd_service_account[0].metadata[0].name, null)
}

output "app_service_account_name" {
  value = try(kubernetes_service_account_v1.app_service_account[0].metadata[0].name, null)
}

output "engineering_group_name" {
  value = local.engineering_group_name
}

output "cicd_role_name" {
  value = try(kubernetes_role_v1.cicd_role[0].metadata[0].name, null)
}

output "app_role_name" {
  value = try(kubernetes_role_v1.app_role[0].metadata[0].name, null)
}

output "namespace" {
  value = kubernetes_namespace_v1.this.metadata[0].name
}
