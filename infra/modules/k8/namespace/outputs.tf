output "name" {
  value = kubernetes_namespace_v1.platform.metadata[0].name
}