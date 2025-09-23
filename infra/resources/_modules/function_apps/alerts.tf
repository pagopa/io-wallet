resource "azurerm_monitor_metric_alert" "function_app_user_response_time" {
  name                = "[${module.function_app_user_02.function_app.function_app.name}] Slow Response Time"
  resource_group_name = var.resource_group_name
  scopes              = [module.function_app_user_02.function_app.function_app.id]
  description         = "Slow responses from the Function App. Beware: deployments may slow it down for some minutes. Always check in application insight. Runbook https://pagopa.atlassian.net/wiki/spaces/SIW/pages/1311735955/Runbook"
  severity            = 1
  frequency           = "PT5M"
  auto_mitigate       = true
  enabled             = true

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "HttpResponseTime"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 5
  }

  action {
    action_group_id = var.action_group_wallet_id
  }

  tags = var.tags
}

resource "azurerm_monitor_metric_alert" "function_app_support_response_time" {
  name                = "[${module.function_app_support.function_app.function_app.name}] Slow Response Time"
  resource_group_name = var.resource_group_name
  scopes              = [module.function_app_support.function_app.function_app.id]
  description         = "Slow responses from the Function App. Beware: deployments may slow it down for some minutes. Always check in application insight. Runbook: https://pagopa.atlassian.net/wiki/spaces/SIW/pages/1311735955/Runbook"
  severity            = 1
  frequency           = "PT5M"
  auto_mitigate       = true
  enabled             = true

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "HttpResponseTime"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 5
  }

  tags = var.tags
}

resource "azurerm_monitor_metric_alert" "app_service_plan_cpu_alert" {
  name                = "[${module.function_app_user_02.function_app.plan.name}] High CPU Usage"
  resource_group_name = var.resource_group_name
  scopes              = [module.function_app_user_02.function_app.plan.id]
  description         = "Critically high CPU usage detected on user App Service Plan"
  severity            = 1
  window_size         = "PT5M"
  frequency           = "PT5M"
  # alert checks CPU average over the last 5 minutes every 5 minutes

  criteria {
    metric_namespace = "Microsoft.Web/serverFarms"
    metric_name      = "CpuPercentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 70
  }

  action {
    action_group_id = var.action_group_wallet_id
  }
}
