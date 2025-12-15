variable "service_name" {
    type = string
}

variable "tags" {
    type = map(string)
}

variable "ecs_subnet_ids" {
    type = list(string)
}

variable "ecs_security_group_ids" {
    type = list(string)
}

variable "image" {
    type = string
}

variable "cpu" {
    type = number
}

variable "memory" {
    type = number
}

variable "region" {
    type = string
}