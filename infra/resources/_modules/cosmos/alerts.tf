resource "azurerm_monitor_metric_alert" "cosmos_db_provisioned_throughput_exceeded" {
  name                = "[${azurerm_cosmosdb_account.apps.name}] Provisioned Throughput Exceeded"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_cosmosdb_account.apps.id]
  description         = "A collection throughput (RU/s) exceed provisioned throughput, and it's raising 429 errors. Please, consider to increase RU"
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
      values   = [var.environment.location]
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

  dynamic "action" {
    for_each = var.action_group_ids
    content {
      action_group_id = action.value
    }

  }

  tags = var.tags
}

locals {
  cosmos_server_error_status_codes = [for code in range(500, 600) : tostring(code)]
}

resource "azurerm_monitor_metric_alert" "cosmos_db_normalized_ru_saturation" {
  name                = "[${azurerm_cosmosdb_account.apps.name}] Normalized RU Saturation"
  resource_group_name = var.resource_group_name
  description         = "Normalized RU consumption exceeded 50% for one minute. Check hot partitions and request load."
  severity            = 2
  window_size         = "PT1M"
  frequency           = "PT1M"
  auto_mitigate       = true

  scopes = [azurerm_cosmosdb_account.apps.id]

  criteria {
    metric_namespace       = "Microsoft.DocumentDB/databaseAccounts"
    metric_name            = "NormalizedRUConsumption"
    aggregation            = "Maximum"
    operator               = "GreaterThan"
    threshold              = 50
    skip_metric_validation  = false

    dimension {
      name     = "DatabaseName"
      operator = "Include"
      values   = ["*"]
    }

    dimension {
      name     = "CollectionName"
      operator = "Include"
      values   = ["*"]
    }

    dimension {
      name     = "Region"
      operator = "Include"
      values   = ["*"]
    }
  }

  dynamic "action" {
    for_each = var.action_group_ids
    content {
      action_group_id = action.value
    }
  }

  tags = var.tags
}

resource "azurerm_monitor_metric_alert" "cosmos_db_throttled_request_percentage" {
  name                = "[${azurerm_cosmosdb_account.apps.name}] Throttled Request Percentage"
  resource_group_name = var.resource_group_name
  description         = "Throttled requests exceeded 5% for one minute. Check RU saturation and partition distribution."
  severity            = 2
  window_size         = "PT1M"
  frequency           = "PT1M"
  auto_mitigate       = true

  scopes = [azurerm_cosmosdb_account.apps.id]

  criteria {
    metric_namespace       = "Microsoft.DocumentDB/databaseAccounts"
    metric_name            = "ThrottledRequestPercentage"
    aggregation            = "Average"
    operator               = "GreaterThan"
    threshold              = 5
    skip_metric_validation  = false

    dimension {
      name     = "DatabaseName"
      operator = "Include"
      values   = ["*"]
    }

    dimension {
      name     = "CollectionName"
      operator = "Include"
      values   = ["*"]
    }

    dimension {
      name     = "Region"
      operator = "Include"
      values   = ["*"]
    }
  }

  dynamic "action" {
    for_each = var.action_group_ids
    content {
      action_group_id = action.value
    }
  }

  tags = var.tags
}

resource "azurerm_monitor_metric_alert" "cosmos_db_gateway_latency" {
  name                = "[${azurerm_cosmosdb_account.apps.name}] Gateway Server Latency"
  resource_group_name = var.resource_group_name
  description         = "Gateway server-side latency exceeded its learned baseline. Check Cosmos diagnostics and dependency latency."
  severity            = 2
  window_size         = "PT5M"
  frequency           = "PT5M"
  auto_mitigate       = true

  scopes = [azurerm_cosmosdb_account.apps.id]

  dynamic_criteria {
    metric_namespace       = "Microsoft.DocumentDB/databaseAccounts"
    metric_name            = "ServerSideLatencyGateway"
    aggregation            = "Average"
    operator               = "GreaterThan"
    alert_sensitivity      = "Medium"
    evaluation_total_count = 3
    evaluation_failure_count = 2
    skip_metric_validation  = false

    dimension {
      name     = "Region"
      operator = "Include"
      values   = ["*"]
    }

    dimension {
      name     = "OperationType"
      operator = "Include"
      values   = ["*"]
    }
  }

  dynamic "action" {
    for_each = var.action_group_ids
    content {
      action_group_id = action.value
    }
  }

  tags = var.tags
}

resource "azurerm_monitor_metric_alert" "cosmos_db_service_availability" {
  name                = "[${azurerm_cosmosdb_account.apps.name}] Service Availability"
  resource_group_name = var.resource_group_name
  description         = "Cosmos DB service availability fell below 99.99% for external requests. Check Azure service health and account regions."
  severity            = 1
  window_size         = "PT1H"
  frequency           = "PT1H"
  auto_mitigate       = true

  scopes = [azurerm_cosmosdb_account.apps.id]

  criteria {
    metric_namespace       = "Microsoft.DocumentDB/databaseAccounts"
    metric_name            = "ServiceAvailability"
    aggregation            = "Minimum"
    operator               = "LessThan"
    threshold              = 99.99
    skip_metric_validation  = false

    dimension {
      name     = "IsExternal"
      operator = "Include"
      values   = ["true"]
    }
  }

  dynamic "action" {
    for_each = var.action_group_ids
    content {
      action_group_id = action.value
    }
  }

  tags = var.tags
}

resource "azurerm_monitor_metric_alert" "cosmos_db_server_errors" {
  name                = "[${azurerm_cosmosdb_account.apps.name}] Server Errors"
  resource_group_name = var.resource_group_name
  description         = "Cosmos DB returned one or more HTTP 5xx requests in the last minute. Investigate the service and account health."
  severity            = 1
  window_size         = "PT1M"
  frequency           = "PT1M"
  auto_mitigate       = true

  scopes = [azurerm_cosmosdb_account.apps.id]

  criteria {
    metric_namespace       = "Microsoft.DocumentDB/databaseAccounts"
    metric_name            = "TotalRequests"
    aggregation            = "Total"
    operator               = "GreaterThan"
    threshold              = 0
    skip_metric_validation  = false

    dimension {
      name     = "StatusCode"
      operator = "Include"
      values   = local.cosmos_server_error_status_codes
    }
  }

  dynamic "action" {
    for_each = var.action_group_ids
    content {
      action_group_id = action.value
    }
  }

  tags = var.tags
}

resource "azurerm_monitor_metric_alert" "cosmos_db_replication_latency" {
  count = var.secondary_location == null ? 0 : 1

  name                = "[${azurerm_cosmosdb_account.apps.name}] Replication Latency"
  resource_group_name = var.resource_group_name
  description         = "Replication latency exceeded its learned baseline between the configured Cosmos DB regions."
  severity            = 2
  window_size         = "PT5M"
  frequency           = "PT5M"
  auto_mitigate       = true

  scopes = [azurerm_cosmosdb_account.apps.id]

  dynamic_criteria {
    metric_namespace       = "Microsoft.DocumentDB/databaseAccounts"
    metric_name            = "ReplicationLatency"
    aggregation            = "Average"
    operator               = "GreaterThan"
    alert_sensitivity      = "Medium"
    evaluation_total_count = 3
    evaluation_failure_count = 2
    skip_metric_validation  = false

    dimension {
      name     = "SourceRegion"
      operator = "Include"
      values   = [var.environment.location]
    }

    dimension {
      name     = "TargetRegion"
      operator = "Include"
      values   = [var.secondary_location]
    }
  }

  dynamic "action" {
    for_each = var.action_group_ids
    content {
      action_group_id = action.value
    }
  }

  tags = var.tags
}
