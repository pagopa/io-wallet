resource "azurerm_monitor_metric_alert" "storage_account_health_check" {
  name                = "[iopitnwalletst01] Low Availability"
  resource_group_name = var.resource_group_name
  description         = "The average availability is less than 99.8%. Runbook: not needed."
  enabled             = true

  severity      = 0
  frequency     = "PT5M"
  auto_mitigate = false
  window_size   = "PT5M"

  scopes = [
    azurerm_storage_account.common.id,
  ]

  action {
    action_group_id = var.action_group_id
  }

  criteria {
    aggregation            = "Average"
    metric_name            = "Availability"
    metric_namespace       = "Microsoft.Storage/storageAccounts"
    operator               = "LessThan"
    skip_metric_validation = false
    threshold              = 99.8
  }

  tags = var.tags
}
