resource "azurerm_monitor_metric_alert" "function_wallet_health_check" {
  name                = "${module.function_wallet.name}-health-check-failed"
  resource_group_name = var.resource_group_name
  scopes              = [module.function_wallet.id]
  description         = "${module.function_wallet.name} health check failed"
  severity            = 1
  frequency           = "PT5M"
  auto_mitigate       = false
  enabled             = false

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "HealthCheckStatus"
    aggregation      = "Average"
    operator         = "LessThan"
    threshold        = 50
  }

  action {
    action_group_id = data.azurerm_monitor_action_group.error_action_group.id
  }
}
