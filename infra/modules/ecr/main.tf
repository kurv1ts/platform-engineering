terraform {
  required_providers {
    aws = { source = "hashicorp/aws" }
  }
}

resource "aws_ecr_repository" "ecr_repository" {
  name = "${var.service_name}-ecr"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
  tags = var.tags
}
