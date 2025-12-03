
module "network" {
  source = "./modules/networking"
}

resource "aws_vpc" "vpc" {
  cidr_block = "10.0.0.0/16"
  tags = {
    Name = "company-vpc"
  }
}

resource "aws_subnet" "public_subnet_a" {
  vpc_id            = aws_vpc.vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "eu-west-1a"
  tags = {
    Name = "company-public-subnet-a"
  }
}

resource "aws_subnet" "public_subnet_b" {
  vpc_id            = aws_vpc.vpc.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "eu-west-1b"
  tags = {
    Name = "company-public-subnet-b"
  }
}

resource "aws_security_group" "http_sg" {
  name        = "company-http-sg"
  description = "Allow HTTP traffic"
  vpc_id      = aws_vpc.vpc.id

  /* Inbound traffic should only come from the Internet Gateway
    and target ALB which listens on 443 and 80 ports (80 is routed to 443)
  */
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "https_sg" {
  name        = "company-https-sg"
  description = "Allow HTTPS traffic"
  vpc_id      = aws_vpc.vpc.id

  // Inbound traffic should only come from the Internet Gateway
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  // Outbound traffic should go out over NAT Gateway
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
