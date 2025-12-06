terraform {
  required_providers {
    aws = { source = "hashicorp/aws" }
  }
}


resource "aws_vpc" "vpc" {
  cidr_block = var.vpc_cidr
  tags = merge(var.tags, { Name = "${var.name}-vpc" })
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.vpc.id
  tags   = merge(var.tags, { Name = "${var.name}-igw" })
}

resource "aws_subnet" "public" {
  for_each = var.public_subnets
  vpc_id            = aws_vpc.vpc.id
  cidr_block        = each.value.cidr_block
  availability_zone = each.value.availability_zone
  tags = merge(var.tags, { Name = "${var.name}-public-subnet-${each.key}" })
}

resource "aws_subnet" "private" {
  for_each = var.private_subnets
  vpc_id            = aws_vpc.vpc.id
  cidr_block        = each.value.cidr_block
  availability_zone = each.value.availability_zone
  tags = merge(var.tags, { Name = "${var.name}-private-subnet-${each.key}" })
}

//Ip address for the NAT Gateway
resource "aws_eip" "nat_ip" {
  for_each = var.create_nat_gateway ? aws_subnet.public : {}
  domain   = "vpc"
  tags  = merge(var.tags, { Name = "${var.name}-nat-eip-${each.key}" })
}

resource "aws_nat_gateway" "nat_gw" {
  for_each      = var.create_nat_gateway ? aws_subnet.public : {}
  allocation_id = aws_eip.nat_ip[each.key].id
  subnet_id     = each.value.id
  tags          = merge(var.tags, { Name = "${var.name}-nat-${each.key}" })
}

resource "aws_route_table" "public" {
  for_each = aws_subnet.public
  vpc_id = aws_vpc.vpc.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = merge(var.tags, { Name = "${var.name}-public-rt-${each.key}" })
}

resource "aws_route_table_association" "public" {
  for_each       = aws_subnet.public
  subnet_id      = each.value.id
  route_table_id = aws_route_table.public[each.key].id
}

resource "aws_route_table" "private" {
  for_each = var.create_nat_gateway ? aws_subnet.private : {}
  vpc_id = aws_vpc.vpc.id
  route {
    cidr_block = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat_gw[each.key].id
  }
  tags = merge(var.tags, { Name = "${var.name}-private-rt-${each.key}" })
}

resource "aws_route_table_association" "private" {
  for_each       = var.create_nat_gateway ? aws_subnet.private : {}
  subnet_id      = each.value.id
  route_table_id = aws_route_table.private[each.key].id
}

/* Create later together with applications
resource "aws_security_group" "http_sg" {
  name        = "${var.name}-http-sg"
  description = "Allow HTTP traffic"
  vpc_id      = aws_vpc.vpc.id
}

resource "aws_vpc_security_group_ingress_rule" "http_sg_rule" {
  for_each = aws_security_group.http_sg
  security_group_id = each.value.id
  cidr_ipv4         = ["0.0.0.0/0"]
  protocol          = "tcp"
  from_port         = 80
  to_port           = 80
  depends_on = [aws_security_group.http_sg]
  tags = merge(var.tags, { Name = "${var.name}-http-sg-ingress-rule" })
}

resource "aws_vpc_security_group_egress_rule" "http_sg_rule" {
  for_each = aws_security_group.http_sg
  security_group_id = each.value.id
  cidr_ipv4         = [for subnet in var.private_subnets : subnet.cidr_block]
  protocol          = "-1"
  depends_on = [aws_security_group.http_sg]
  tags = merge(var.tags, { Name = "${var.name}-http-sg-egress-rule" })
}

resource "aws_security_group" "https_sg" {
  name        = "${var.name}-https-sg"
  description = "Allow HTTPS traffic"
  vpc_id      = aws_vpc.vpc.id
  tags = merge(var.tags, { Name = "${var.name}-https-sg" })
}

resource "aws_vpc_security_group_egress_rule" "https_sg_rule" {
  for_each = aws_security_group.https_sg
  security_group_id = each.value.id
  cidr_ipv4         = [for subnet in var.private_subnets : subnet.cidr_block]
  protocol          = "-1"
  depends_on = [aws_security_group.https_sg]
  tags = merge(var.tags, { Name = "${var.name}-https-sg-egress-rule" })
}

resource "aws_vpc_security_group_ingress_rule" "https_sg_rule" {
  for_each = aws_security_group.https_sg
  security_group_id = each.value.id
  cidr_ipv4         = ["0.0.0.0/0"]
  protocol          = "tcp"
  from_port         = 443
  to_port           = 443
  depends_on = [aws_security_group.https_sg]
  tags = merge(var.tags, { Name = "${var.name}-https-sg-ingress-rule" })
}

*/