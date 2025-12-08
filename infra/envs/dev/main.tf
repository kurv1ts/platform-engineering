module "network" {
  source       = "../../modules/network"
  service_name = var.service_name
  //65536 addresses per VPC
  vpc_cidr = "10.0.0.0/16"
  //256 addresses per subnet
  public_subnets     = { a = { cidr_block = "10.0.1.0/24", availability_zone = "eu-west-1a" }, b = { cidr_block = "10.0.2.0/24", availability_zone = "eu-west-1b" } }
  private_subnets    = { a = { cidr_block = "10.0.3.0/24", availability_zone = "eu-west-1a" }, b = { cidr_block = "10.0.4.0/24", availability_zone = "eu-west-1b" } }
  create_nat_gateway = true
  tags               = merge(var.tags, { service = "${var.service_name}", env = var.env })
  providers = {
    aws = aws.dev
  }
}

module "ecs" {
  source                = "../../modules/ecs"
  service_name          = var.service_name
  tags                  = merge(var.tags, { service = "${var.service_name}", env = var.env })
  ecs_subnet_ids        = module.network.private_subnet_ids
  ecs_security_group_ids = [module.network.service_x_http_sg_id]
  image                 = "p6hi/service-x-repository:dummy-healthcheck"
  cpu                   = 1024
  memory                = 2048
  region                = "eu-west-1"
  providers = {
    aws = aws.dev
  }
}

/*
ECR is not supported in localstack free tier
module "ecr" {
  source       = "../../modules/ecr"
  service_name = var.service_name
  tags         = merge(var.tags, { service = "${var.service_name}", env = var.env })
  providers = {
    aws = aws.dev
  }
}
*/
