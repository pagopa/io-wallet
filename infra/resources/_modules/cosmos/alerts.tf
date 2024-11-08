resource "azurerm_monitor_metric_alert" "cosmos_db_provisioned_throughput_exceeded" {
  name                = "[${azurerm_cosmosdb_account.wallet.name}] Provisioned Throughput Exceeded"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_cosmosdb_account.wallet.id]
  description         = "A collection throughput (RU/s) exceed provisioned throughput, and it's raising 429 errors. Please, consider to increase RU. Runbook: https://pagopa.atlassian.net/wiki/spaces/SIW/pages/1311735955/Runbook"
  severity            = 0
  window_size         = "PT5M"
  frequency           = "PT5M"
  auto_mitigate       = false

  # Metric info
  # https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/metrics-supported#microsoftdocumentdbdatabaseaccounts
  criteria {
    metric_namespace       = "Microsoft.DocumentDB/databaseAccounts"
    metric_name            = "TotalRequestUnits"
    aggregation            = "Total"
    operator               = "GreaterThan"
    threshold              = 0
    skip_metric_validation = false

    dimension {
      name     = "Region"
      operator = "Include"
      values   = [var.location]
    }

    dimension {
      name     = "StatusCode"
      operator = "Include"
      values   = ["429"]
    }

    dimension {
      name     = "CollectionName"
      operator = "Include"
      values   = ["*"]
    }
  }

  action {
    action_group_id = var.action_group_wallet_id
  }

  action {
    action_group_id = var.action_group_io_id
  }

  tags = var.tags
}
