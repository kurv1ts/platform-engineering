terraform {
  required_providers {
    aws = { source = "hashicorp/aws" }
  }
}


resource "aws_ecs_cluster" "ecs_cluster" {
  name = "${var.service_name}-ecs-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = var.tags
}


resource "aws_cloudwatch_log_group" "ecs_cluster_log_group" {
  name = "${var.service_name}-ecs-cluster-log-group"
  tags = var.tags
}


resource "aws_ecs_service" "ecs_service" {
  name            = "${var.service_name}-ecs-service"
  cluster         = aws_ecs_cluster.ecs_cluster.id
  task_definition = aws_ecs_task_definition.ecs_task_definition.arn
  desired_count   = 1
  //iam_role        = aws_iam_role.foo.arn
  //depends_on      = [aws_iam_role_policy.foo]

  launch_type = "FARGATE"

  network_configuration {
    subnets = var.ecs_subnet_ids
    security_groups = var.ecs_security_group_ids
  }

  deployment_configuration {
    strategy             = "CANARY"
    bake_time_in_minutes = 5

    canary_configuration {
      canary_percent              = 20
      canary_bake_time_in_minutes = 2
    }
  }

/*
  load_balancer {
    target_group_arn = aws_lb_target_group.foo.arn
    container_name   = "mongo"
    container_port   = 8080
  }
  */
  tags = var.tags
}

resource "aws_ecs_task_definition" "ecs_task_definition" {
  family = "${var.service_name}-task-definition"
  container_definitions = templatefile("${path.module}/task_definition.json", {
    service_name = var.service_name
    image = var.image
    cpu = var.cpu
    memory = var.memory
    region = var.region
  })
  tags = var.tags
}