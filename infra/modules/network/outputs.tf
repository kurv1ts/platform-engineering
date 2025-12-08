output "vpc_id" { value = aws_vpc.vpc.id }
output "public_subnet_ids" { value = [for s in aws_subnet.public : s.id] }
output "private_subnet_ids" { value = [for s in aws_subnet.private : s.id] }
output "service_x_http_sg_id" { value = aws_security_group.http_sg.id }
