locals {
  namespace_name = "${var.team_name}-${var.env}"
  cicd_service_account_name = "${var.team_name}-cicd"
  app_service_account_name  = "${var.team_name}-app"
  engineering_group_name = coalesce(var.engineering_group_name, "${var.team_name}-engineering")
}
