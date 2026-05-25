resource "azurerm_monitor_scheduled_query_rules_alert" "create_wallet_instance_no_open_status_lists" {
  name                    = "[${module.function_apps.function_app_user.name}] No OPEN status lists available for allocation"
  location                = local.environment.location
  resource_group_name     = data.azurerm_resource_group.wallet.name
  severity                = 0
  description             = "CreateWalletInstance failed because no OPEN status lists were available for allocation"
  auto_mitigation_enabled = true

  action {
    action_group = [module.monitoring.action_group_wallet.id]
  }

  query = <<-EOT
    AppExceptions
    | where Properties["functionName"] == "createWalletInstance"
    | where OuterMessage == "No OPEN status lists available for allocation"
    | summarize AggregatedValue = sum(ItemCount)
    EOT

  data_source_id = data.azurerm_log_analytics_workspace.core.id

  trigger {
    operator  = "GreaterThanOrEqual"
    threshold = 1
  }

  frequency   = 5
  time_window = 10

  tags = local.tags
}

resource "azurerm_monitor_scheduled_query_rules_alert" "status_list_manager_errors" {
  name                    = "[${module.function_apps.function_app_user.name}] StatusListManager Errors"
  location                = local.environment.location
  resource_group_name     = data.azurerm_resource_group.wallet.name
  severity                = 1
  description             = "StatusListManager emitted one or more errors"
  auto_mitigation_enabled = true

  action {
    action_group = [module.monitoring.action_group_wallet.id]
  }

  query = <<-EOT
    AppExceptions
    | where Properties["functionName"] == "statusListManager"
    | summarize AggregatedValue = sum(ItemCount)
    EOT

  data_source_id = data.azurerm_log_analytics_workspace.core.id

  trigger {
    operator  = "GreaterThanOrEqual"
    threshold = 1
  }

  frequency   = 5
  time_window = 10

  tags = local.tags
}

resource "azurerm_monitor_scheduled_query_rules_alert" "status_list_publication_errors" {
  name                    = "[${module.function_apps.function_app_user.name}] StatusListPublication Errors"
  location                = local.environment.location
  resource_group_name     = data.azurerm_resource_group.wallet.name
  severity                = 1
  description             = "StatusListPublication emitted one or more errors"
  auto_mitigation_enabled = true

  action {
    action_group = [module.monitoring.action_group_wallet.id]
  }

  query = <<-EOT
    AppExceptions
    | where Properties["functionName"] in ("statusListPublicationDispatcher", "statusListPublication")
    | summarize AggregatedValue = sum(ItemCount)
    EOT

  data_source_id = data.azurerm_log_analytics_workspace.core.id

  trigger {
    operator  = "GreaterThanOrEqual"
    threshold = 1
  }

  frequency   = 5
  time_window = 10

  tags = local.tags
}

resource "azurerm_monitor_scheduled_query_rules_alert" "status_list_publication_monitor_critical_issues" {
  name                    = "[${module.function_apps.function_app_user.name}] StatusListPublicationMonitor Critical Issues"
  location                = local.environment.location
  resource_group_name     = data.azurerm_resource_group.wallet.name
  severity                = 1
  description             = "StatusListPublicationMonitor detected CDN or JWT validity issues on published status lists"
  auto_mitigation_enabled = true

  action {
    action_group = [module.monitoring.action_group_wallet.id]
  }

  query = <<-EOT
    AppExceptions
    | where Properties["functionName"] == "statusListPublicationMonitor"
    | summarize AggregatedValue = sum(ItemCount)
    EOT

  data_source_id = data.azurerm_log_analytics_workspace.core.id

  trigger {
    operator  = "GreaterThanOrEqual"
    threshold = 1
  }

  frequency   = 5
  time_window = 10

  tags = local.tags
}