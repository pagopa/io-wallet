resource "azurerm_monitor_metric_alert" "cosmos_wallet_throttling_alert" {
  name                = "[WALLET | ${module.cosmos_account_wallet.name}] Throttling"
  resource_group_name = var.resource_group_name
  scopes              = [module.cosmos_account_wallet.id]
  # TODO: add Runbook for checking errors
  description   = "One or more collections consumed throughput (RU/s) exceed provisioned throughput. Please, consider to increase RU for these collections. Runbook: https://pagopa.atlassian.net/wiki/spaces/IC/pages/723452380/CosmosDB+-+Increase+Max+RU"
  severity      = 0
  window_size   = "PT5M"
  frequency     = "PT5M"
  auto_mitigate = false

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
      values   = ["North Italy"]
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
    action_group_id    = data.azurerm_monitor_action_group.error_action_group.id
    webhook_properties = {}
  }

  tags = var.tags
}
