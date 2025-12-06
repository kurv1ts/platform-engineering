variable "env" {
  type = string
  default = "dev"
}

variable "tags" {
  type = map(string)
  default = {name = "company-x"}
}

variable "public_subnets" {
  type = map(object({ cidr_block = string, availability_zone = string }))
  default = {
  a = { cidr_block = "10.0.1.0/24", availability_zone = "eu-west-1a" }
    b = { cidr_block = "10.0.2.0/24", availability_zone = "eu-west-1b" }
  }
}

variable "private_subnets" {
  type = map(object({ cidr_block = string, availability_zone = string }))
  default = {
    a = { cidr_block = "10.0.3.0/24", availability_zone = "eu-west-1a" }
    b = { cidr_block = "10.0.4.0/24", availability_zone = "eu-west-1b" }
  }

  validation {
    condition     = keys(var.public_subnets) == keys(var.private_subnets)
    error_message = "public_subnets and private_subnets must have the same keys per AZ"
  }
}