resource "azurerm_monitor_metric_alert" "storage_account_low_availability" {
  name                = "[${azurerm_storage_account.this.name}] Low Availability"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_storage_account.this.id]
  description         = "The average availability is less than 99.8%"
  severity            = 0
  window_size         = "PT5M"
  frequency           = "PT5M"
  auto_mitigate       = false

  # Metric info
  # https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/metrics-supported#microsoftstoragestorageaccounts
  criteria {
    metric_namespace       = "Microsoft.Storage/storageAccounts"
    metric_name            = "Availability"
    aggregation            = "Average"
    operator               = "LessThan"
    threshold              = 99.8
    skip_metric_validation = false
  }

  action {
    action_group_id = var.action_group_wallet_id
  }

  action {
    action_group_id = var.action_group_io_id
  }

  tags = var.tags
}

resource "azurerm_monitor_scheduled_query_rules_alert" "cdn_requests_error_alert" {
  name                = "[${azurerm_cdn_profile.this.name}] Request Errors"
  location            = var.location_legacy
  resource_group_name = var.resource_group_name
  severity            = 0
  description         = "Elevated rate of 4xx and 5xx errors from the CDN"

  action {
    action_group = [var.action_group_wallet_id, var.action_group_io_id]
  }

  query = format(<<-EOT
    AzureDiagnostics
    | where ResourceId == toupper("%s")
    | where Category == "AzureCdnAccessLog"
    | where isReceivedFromClient_b == true
    | where requestUri_s == "https://wallet.io.pagopa.it:443/.well-known/openid-federation"
    | where httpStatus_d >= 400
    | summarize AggregatedValue = count()
    EOT
  , azurerm_cdn_profile.this.id)

  data_source_id = var.log_analytics_workspace_id

  trigger {
    operator  = "GreaterThanOrEqual"
    threshold = 1
  }

  frequency   = 5
  time_window = 5

  tags = var.tags
}
