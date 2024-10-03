resource "azurerm_monitor_metric_alert" "function_app_user_response_time" {
  name                = "[${module.function_app_user.function_app.function_app.name}] Slow Response Time"
  resource_group_name = var.resource_group_name
  scopes              = [module.function_app_user.function_app.function_app.id]
  description         = "Slow responses from the Function App. Beware: deployments may slow it down for some minutes. Always check in application insight."
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

  action {
    action_group_id = var.action_group_io_id
  }

  tags = var.tags
}

resource "azurerm_monitor_metric_alert" "function_app_support_response_time" {
  name                = "[${module.function_app_support.function_app.function_app.name}] Slow Response Time"
  resource_group_name = var.resource_group_name
  scopes              = [module.function_app_support.function_app.function_app.id]
  description         = "Slow responses from the Function App. Beware: deployments may slow it down for some minutes. Always check in application insight."
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

  action {
    action_group_id = var.action_group_io_id
  }

  tags = var.tags
}
