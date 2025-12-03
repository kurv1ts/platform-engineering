resource "aws_lb" "company_public_alb" {
  name               = "company-public-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.http_sg.id, aws_security_group.https_sg.id]
  subnets            = [aws_subnet.public_subnet_a.id, aws_subnet.public_subnet_b.id]

  access_logs {
    bucket  = aws_s3_bucket.lb_logs.id
    prefix  = "company-public-alb"
    enabled = true
  }

  tags = {
    Name = "company-public-alb"
    Environment = "dev"
  }
}