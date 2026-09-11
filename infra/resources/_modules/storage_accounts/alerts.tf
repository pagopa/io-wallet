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

locals {
  storage_account_metric_alerts = {
    Egress = {
      aggregation = "Total"
      description = "Egress exceeded 1 GB in 5 minutes. Monitor for excessive outbound data transfer costs."
      frequency   = "PT5M"
      name        = "High Egress"
      threshold   = 1e9
      window_size = "PT5M"
    }
    Ingress = {
      aggregation = "Total"
      description = "Ingress exceeded 1 GB in 5 minutes. Check for large data ingestion patterns."
      frequency   = "PT5M"
      name        = "High Ingress"
      threshold   = 1e9
      window_size = "PT5M"
    }
    SuccessE2ELatency = {
      aggregation = "Average"
      description = "Average end-to-end latency exceeded 200 ms. Optimize application or storage configuration."
      frequency   = "PT5M"
      name        = "High Success E2E Latency"
      threshold   = 200
      window_size = "PT5M"
    }
    SuccessServerLatency = {
      aggregation = "Average"
      description = "Average server latency exceeded 100 ms. Check backend performance or throttling."
      frequency   = "PT5M"
      name        = "High Success Server Latency"
      threshold   = 100
      window_size = "PT5M"
    }
    Transactions = {
      aggregation = "Total"
      description = "Transactions exceeded 100,000 in 5 minutes. Review workload patterns or scale the storage account."
      frequency   = "PT5M"
      name        = "High Transactions"
      threshold   = 100000
      window_size = "PT5M"
    }
    UsedCapacity = {
      aggregation = "Average"
      description = "Average used capacity exceeded 8 TB. Consider increasing capacity or cleaning up unused data."
      frequency   = "PT1H"
      name        = "High Used Capacity"
      threshold   = 8e12
      window_size = "PT1H"
    }
  }
}

resource "azurerm_monitor_metric_alert" "storage_account_metrics_thresholds" {
  for_each = local.storage_account_metric_alerts

  name                = "[${azurerm_storage_account.common.name}] ${each.value.name}"
  resource_group_name = var.resource_group_name
  description         = "${each.value.description} Runbook: not needed."
  enabled             = true

  severity      = 0
  frequency     = each.value.frequency
  auto_mitigate = false
  window_size   = each.value.window_size

  scopes = [
    azurerm_storage_account.common.id,
  ]

  action {
    action_group_id = var.action_group_id
  }

  criteria {
    aggregation            = each.value.aggregation
    metric_name            = each.key
    metric_namespace       = "Microsoft.Storage/storageAccounts"
    operator               = "GreaterThan"
    skip_metric_validation = false
    threshold              = each.value.threshold
  }

  tags = var.tags
}
