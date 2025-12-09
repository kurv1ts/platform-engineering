
terraform {
  required_providers {
    kubernetes = { source = "hashicorp/kubernetes" }
  }
}


resource "kubernetes_deployment_v1" "deployment" {
  metadata {
    name      = var.deployment_name
    namespace = var.namespace
    labels = {
      app = var.deployment_name
    }
  }

  spec {
    replicas = var.replicas
    selector {
      match_labels = {
        app = var.deployment_name
      }
    }

    template {
      metadata {
        labels = {
          app = var.deployment_name
        }
      }

      spec {
        container {
          image = "nginx:1.21.6"
          name  = "nginx-terraform"

          resources {
            limits = {
              cpu    = "0.5"
              memory = "512Mi"
            }
            requests = {
              cpu    = "250m"
              memory = "50Mi"
            }
          }

          liveness_probe {
            http_get {
              path = "/"
              port = 80

              http_header {
                name  = "X-Custom-Header"
                value = "TestCustomerHeader"
              }
            }

            initial_delay_seconds = 3
            period_seconds        = 3
          }
        }
      }
    }

  }

}
