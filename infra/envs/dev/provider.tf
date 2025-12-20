terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.23.0"
    }
    kind = {
      source  = "tehcyx/kind"
      version = "0.10.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "3.0.1"
    }
  }
  backend "s3" {
    profile    = "localstack"
    bucket     = "terraform-state"
    key        = "state/terraform.tfstate"
    region     = "eu-west-1"
    access_key = "test"
    secret_key = "test"
    endpoints = {
      s3 = "http://localhost:4566"
    }
    encrypt                     = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    force_path_style            = true
  }
}

provider "kubernetes" {
  host                   = module.k8_cluster.endpoint
  cluster_ca_certificate = module.k8_cluster.cluster_ca_certificate
  client_certificate     = module.k8_cluster.client_certificate
  client_key             = module.k8_cluster.client_key
}

provider "kind" {}

provider "aws" {
  alias                       = "dev"
  profile                     = "localstack"
  region                      = "eu-west-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  endpoints {
    s3  = "http://localhost:4566"
    ec2 = "http://localhost:4566"
    ecs = "http://localhost:4566"
    iam = "http://localhost:4566"
    elb = "http://localhost:4566"
    sts = "http://localhost:4566"
    ecr = "http://localhost:4566"
  }
}
