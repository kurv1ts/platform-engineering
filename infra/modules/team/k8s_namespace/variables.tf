
variable "team_name" {
  type = string

  validation {
    condition     = length(var.team_name) > 0 && can(regex("^[a-z0-9]([a-z0-9-]*[a-z0-9])?$", var.team_name))
    error_message = "team_name must be a DNS-1123 label (lowercase alphanumeric or '-', starting/ending with alphanumeric)."
  }
}

variable "env" {
  type = string

  validation {
    condition     = length(var.env) > 0 && can(regex("^[a-z0-9]([a-z0-9-]*[a-z0-9])?$", var.env))
    error_message = "env must be a DNS-1123 label (lowercase alphanumeric or '-', starting/ending with alphanumeric)."
  }
}

variable "create_cicd_service_account" {
  type    = bool
  default = true
}

variable "create_app_service_account" {
  type    = bool
  default = true
}

variable "create_engineering_rbac" {
  type    = bool
  default = true
}

variable "engineering_group_name" {
  type    = string
  default = null
}

variable "namespace_labels" {
  type    = map(string)
  default = {}
}

variable "namespace_annotations" {
  type    = map(string)
  default = {}
}
