resource "azurerm_monitor_metric_alert" "firewall" {
  provider = azurerm.hub

  for_each = local.firewall_alerts

  name                = "[${data.azurerm_firewall.hub.name}] ${each.value.display_name}"
  resource_group_name = azurerm_resource_group.network.name
  description         = each.value.description
  severity            = 2
  enabled             = true
  auto_mitigate       = true

  scopes = [data.azurerm_firewall.hub.id]

  frequency   = "PT1M"
  window_size = "PT5M"

  criteria {
    metric_namespace       = "Microsoft.Network/azureFirewalls"
    metric_name            = each.value.metric_name
    aggregation            = each.value.aggregation
    operator               = each.value.operator
    threshold              = each.value.threshold
    skip_metric_validation = false
  }

  action {
    action_group_id = data.azurerm_monitor_action_group.wallet.id
  }

  tags = local.tags
}

resource "azurerm_monitor_metric_alert" "appgw" {
  for_each = local.appgw_alerts

  name                = "[${azurerm_application_gateway.hub.name}] ${each.value.display_name}"
  resource_group_name = azurerm_resource_group.network.name
  scopes              = [azurerm_application_gateway.hub.id]
  description         = each.value.description
  severity            = each.value.severity
  frequency           = "PT1M"
  window_size         = "PT5M"
  auto_mitigate       = true

  dynamic "criteria" {
    for_each = try(each.value.dynamic, false) ? [] : [each.value]
    content {
      metric_namespace = "Microsoft.Network/applicationgateways"
      metric_name      = criteria.value.metric
      aggregation      = criteria.value.aggregation
      operator         = "GreaterThan"
      threshold        = criteria.value.threshold

      dynamic "dimension" {
        for_each = try(criteria.value.dimensions, {})
        content {
          name     = dimension.key
          operator = "Include"
          values   = dimension.value
        }
      }
    }
  }

  dynamic "dynamic_criteria" {
    for_each = try(each.value.dynamic, false) ? [each.value] : []
    content {
      metric_namespace         = "Microsoft.Network/applicationgateways"
      metric_name              = dynamic_criteria.value.metric
      aggregation              = dynamic_criteria.value.aggregation
      operator                 = "GreaterThan"
      alert_sensitivity        = "Medium"
      evaluation_total_count   = 2
      evaluation_failure_count = 2

      dynamic "dimension" {
        for_each = try(dynamic_criteria.value.dimensions, {})
        content {
          name     = dimension.key
          operator = "Include"
          values   = dimension.value
        }
      }
    }
  }

  action {
    action_group_id = data.azurerm_monitor_action_group.wallet.id
  }

  tags = local.tags
}
