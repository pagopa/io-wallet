resource "azurerm_monitor_scheduled_query_rules_alert_v2" "create_wallet_instance_no_open_status_lists" {
  name                    = "[${module.function_apps.function_app_user.name}] No OPEN status lists available for allocation"
  location                = local.environment.location
  resource_group_name     = data.azurerm_resource_group.wallet.name
  severity                = 0
  description             = "CreateWalletInstance failed because no OPEN status lists were available for allocation"
  auto_mitigation_enabled = true
  evaluation_frequency    = "PT5M"
  window_duration         = "PT10M"
  scopes                  = [data.azurerm_log_analytics_workspace.core.id]

  action {
    action_groups = [module.monitoring.action_group_wallet.id]
  }

  criteria {
    query = <<-EOT
      AppExceptions
      | where AppRoleName == "${module.function_apps.function_app_user.name}"
      | where Properties["functionName"] == "createWalletInstance"
      | where OuterMessage == "No OPEN status lists available for allocation"
      | summarize AggregatedValue = sum(ItemCount)
      EOT
    time_aggregation_method = "Total"
    metric_measure_column   = "AggregatedValue"
    operator  = "GreaterThanOrEqual"
    threshold = 1
    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  tags = local.tags
}

resource "azurerm_monitor_scheduled_query_rules_alert_v2" "create_wallet_instance_no_open_status_lists_uat" {
  name                    = "[${module.function_apps.function_app_user_uat.name}] No OPEN status lists available for allocation"
  location                = local.environment.location
  resource_group_name     = data.azurerm_resource_group.wallet.name
  severity                = 0
  description             = "CreateWalletInstance failed because no OPEN status lists were available for allocation"
  auto_mitigation_enabled = true
  evaluation_frequency    = "PT5M"
  window_duration         = "PT10M"
  scopes                  = [data.azurerm_log_analytics_workspace.core.id]

  action {
    action_groups = [module.monitoring.action_group_wallet.id]
  }

  criteria {
    query = <<-EOT
      AppExceptions
      | where AppRoleName == "${module.function_apps.function_app_user_uat.name}"
      | where Properties["functionName"] == "createWalletInstance"
      | where OuterMessage == "No OPEN status lists available for allocation"
      | summarize AggregatedValue = sum(ItemCount)
      EOT
    time_aggregation_method = "Total"
    metric_measure_column   = "AggregatedValue"
    operator                = "GreaterThanOrEqual"
    threshold               = 1
    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  tags = local.tags
}

resource "azurerm_monitor_scheduled_query_rules_alert_v2" "status_list_manager_errors" {
  name                    = "[${module.function_apps.function_app_user.name}] StatusListManager Errors"
  location                = local.environment.location
  resource_group_name     = data.azurerm_resource_group.wallet.name
  severity                = 1
  description             = "StatusListManager emitted one or more errors"
  auto_mitigation_enabled = true
  evaluation_frequency    = "PT5M"
  window_duration         = "PT10M"
  scopes                  = [data.azurerm_log_analytics_workspace.core.id]

  action {
    action_groups = [module.monitoring.action_group_wallet.id]
  }

  criteria {
    query = <<-EOT
      AppExceptions
      | where AppRoleName == "${module.function_apps.function_app_user.name}"
      | where Properties["functionName"] == "statusListManager"
      | summarize AggregatedValue = sum(ItemCount)
      EOT
    time_aggregation_method = "Total"
    metric_measure_column   = "AggregatedValue"
    operator  = "GreaterThanOrEqual"
    threshold = 1
    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  tags = local.tags
}

resource "azurerm_monitor_scheduled_query_rules_alert_v2" "status_list_manager_errors_uat" {
  name                    = "[${module.function_apps.function_app_user_uat.name}] StatusListManager Errors"
  location                = local.environment.location
  resource_group_name     = data.azurerm_resource_group.wallet.name
  severity                = 1
  description             = "StatusListManager emitted one or more errors"
  auto_mitigation_enabled = true
  evaluation_frequency    = "PT5M"
  window_duration         = "PT10M"
  scopes                  = [data.azurerm_log_analytics_workspace.core.id]

  action {
    action_groups = [module.monitoring.action_group_wallet.id]
  }

  criteria {
    query = <<-EOT
      AppExceptions
      | where AppRoleName == "${module.function_apps.function_app_user_uat.name}"
      | where Properties["functionName"] == "statusListManager"
      | summarize AggregatedValue = sum(ItemCount)
      EOT
    time_aggregation_method = "Total"
    metric_measure_column   = "AggregatedValue"
    operator                = "GreaterThanOrEqual"
    threshold               = 1
    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  tags = local.tags
}

resource "azurerm_monitor_scheduled_query_rules_alert_v2" "status_list_publication_errors" {
  name                    = "[${module.function_apps.function_app_user.name}] StatusListPublication Errors"
  location                = local.environment.location
  resource_group_name     = data.azurerm_resource_group.wallet.name
  severity                = 1
  description             = "StatusListPublication emitted one or more errors"
  auto_mitigation_enabled = true
  evaluation_frequency    = "PT5M"
  window_duration         = "PT10M"
  scopes                  = [data.azurerm_log_analytics_workspace.core.id]

  action {
    action_groups = [module.monitoring.action_group_wallet.id]
  }

  criteria {
    query = <<-EOT
      AppExceptions
      | where AppRoleName == "${module.function_apps.function_app_user.name}"
      | where Properties["functionName"] in ("statusListPublicationDispatcher", "statusListPublication")
      | summarize AggregatedValue = sum(ItemCount)
      EOT
    time_aggregation_method = "Total"
    metric_measure_column   = "AggregatedValue"
    operator  = "GreaterThanOrEqual"
    threshold = 1
    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  tags = local.tags
}

resource "azurerm_monitor_scheduled_query_rules_alert_v2" "status_list_publication_errors_uat" {
  name                    = "[${module.function_apps.function_app_user_uat.name}] StatusListPublication Errors"
  location                = local.environment.location
  resource_group_name     = data.azurerm_resource_group.wallet.name
  severity                = 1
  description             = "StatusListPublication emitted one or more errors"
  auto_mitigation_enabled = true
  evaluation_frequency    = "PT5M"
  window_duration         = "PT10M"
  scopes                  = [data.azurerm_log_analytics_workspace.core.id]

  action {
    action_groups = [module.monitoring.action_group_wallet.id]
  }

  criteria {
    query = <<-EOT
      AppExceptions
      | where AppRoleName == "${module.function_apps.function_app_user_uat.name}"
      | where Properties["functionName"] in ("statusListPublicationDispatcher", "statusListPublication")
      | summarize AggregatedValue = sum(ItemCount)
      EOT
    time_aggregation_method = "Total"
    metric_measure_column   = "AggregatedValue"
    operator                = "GreaterThanOrEqual"
    threshold               = 1
    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  tags = local.tags
}

resource "azurerm_monitor_scheduled_query_rules_alert_v2" "status_list_publication_monitor_critical_issues" {
  name                    = "[${module.function_apps.function_app_user.name}] StatusListPublicationMonitor Critical Issues"
  location                = local.environment.location
  resource_group_name     = data.azurerm_resource_group.wallet.name
  severity                = 1
  description             = "StatusListPublicationMonitor detected CDN or JWT validity issues on published status lists"
  auto_mitigation_enabled = true
  evaluation_frequency    = "PT5M"
  window_duration         = "PT10M"
  scopes                  = [data.azurerm_log_analytics_workspace.core.id]

  action {
    action_groups = [module.monitoring.action_group_wallet.id]
  }

  criteria {
    query = <<-EOT
      AppExceptions
      | where AppRoleName == "${module.function_apps.function_app_user.name}"
      | where Properties["functionName"] == "statusListPublicationMonitor"
      | summarize AggregatedValue = sum(ItemCount)
      EOT
    time_aggregation_method = "Total"
    metric_measure_column   = "AggregatedValue"
    operator  = "GreaterThanOrEqual"
    threshold = 1
    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  tags = local.tags
}

resource "azurerm_monitor_scheduled_query_rules_alert_v2" "status_list_publication_monitor_critical_issues_uat" {
  name                    = "[${module.function_apps.function_app_user_uat.name}] StatusListPublicationMonitor Critical Issues"
  location                = local.environment.location
  resource_group_name     = data.azurerm_resource_group.wallet.name
  severity                = 1
  description             = "StatusListPublicationMonitor detected CDN or JWT validity issues on published status lists"
  auto_mitigation_enabled = true
  evaluation_frequency    = "PT5M"
  window_duration         = "PT10M"
  scopes                  = [data.azurerm_log_analytics_workspace.core.id]

  action {
    action_groups = [module.monitoring.action_group_wallet.id]
  }

  criteria {
    query = <<-EOT
      AppExceptions
      | where AppRoleName == "${module.function_apps.function_app_user_uat.name}"
      | where Properties["functionName"] == "statusListPublicationMonitor"
      | summarize AggregatedValue = sum(ItemCount)
      EOT
    time_aggregation_method = "Total"
    metric_measure_column   = "AggregatedValue"
    operator                = "GreaterThanOrEqual"
    threshold               = 1
    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  tags = local.tags
}