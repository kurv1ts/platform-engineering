module "network" {
  source            = "../../modules/network"
  name              = var.tags.name
  //65536 addresses per VPC
  vpc_cidr          = "10.0.0.0/16"
  //256 addresses per subnet
  public_subnets    = { a = { cidr_block = "10.0.1.0/24", availability_zone = "eu-west-1a" }, b = { cidr_block = "10.0.2.0/24", availability_zone = "eu-west-1b" } }
  private_subnets   = { a = { cidr_block = "10.0.3.0/24", availability_zone = "eu-west-1a" }, b = { cidr_block = "10.0.4.0/24", availability_zone = "eu-west-1b" } }
  create_nat_gateway = true
  tags              = merge({ env = var.env }, var.tags)
  providers = {
    aws = aws.dev
  }
}