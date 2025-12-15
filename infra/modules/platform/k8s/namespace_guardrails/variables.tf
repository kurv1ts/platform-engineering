variable "env" {
  type = string
}

variable "name" {
  type = string
}

variable "labels" {
  type    = map(string)
  default = {}
}

variable "annotations" {
  type    = map(string)
  default = {}
}

variable "pod_security_standard" {
  type        = string
  default     = "baseline"
  description = "Namespace-scoped Pod Security Admission (PSA) level. This is enforced by the Kubernetes API server when PSA is enabled."

  validation {
    condition     = contains(["privileged", "baseline", "restricted"], var.pod_security_standard)
    error_message = "pod_security_standard must be one of: privileged, baseline, restricted."
  }
}

variable "pod_security_version" {
  type        = string
  default     = "latest"
  description = "PSA version label. Use \"latest\" to avoid pinning to a specific Kubernetes minor version."

  validation {
    condition     = var.pod_security_version == "latest" || can(regex("^v\\d+\\.\\d+$", var.pod_security_version))
    error_message = "pod_security_version must be \"latest\" or of the form \"v<major>.<minor>\" (e.g. \"v1.29\")."
  }
}

variable "enable_default_deny_ingress" {
  type        = bool
  default     = true
  description = "Creates a default-deny ingress NetworkPolicy (requires a NetworkPolicy-capable Container Network Interface to take effect)."
}

variable "enable_default_deny_egress" {
  type        = bool
  default     = false
  description = "Creates a default-deny egress NetworkPolicy (requires a NetworkPolicy-capable Container Network Interface). Start with false if you haven't planned egress allowlists yet."
}

variable "enable_allow_dns_egress" {
  type        = bool
  default     = true
  description = "Allows DNS egress (TCP/UDP 53) to kube-dns/coredns in kube-system when default-deny egress is enabled."
}

variable "enable_resource_quota" {
  type        = bool
  default     = true
  description = "Creates a ResourceQuota to prevent a namespace from consuming unbounded cluster resources."
}

variable "resource_quota_hard" {
  type        = map(string)
  description = "ResourceQuota hard limits; values are Kubernetes Quantity strings."
  default = {
    "pods"            = "50"
    "services"        = "10"
    "configmaps"      = "100"
    "secrets"         = "100"
    "requests.cpu"    = "4"
    "requests.memory" = "8Gi"
    "limits.cpu"      = "8"
    "limits.memory"   = "16Gi"
  }
}

variable "enable_limit_range" {
  type        = bool
  default     = true
  description = "Creates a LimitRange so pods get sane default requests/limits when teams forget to set them."
}

variable "limit_range_container_defaults" {
  type = object({
    default = map(string)
    default_request = map(string)
    max = map(string)
  })

  default = {
    default = {
      cpu    = "500m"
      memory = "512Mi"
    }
    default_request = {
      cpu    = "100m"
      memory = "128Mi"
    }
    max = {
      cpu    = "2"
      memory = "2Gi"
    }
  }
}
