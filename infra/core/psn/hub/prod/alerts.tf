resource "azurerm_monitor_metric_alert" "firewall" {
  provider = azurerm.hub

  for_each = local.firewall_alerts

  name                = "[${data.azurerm_firewall.hub.name}] ${each.value.display_name}"
  resource_group_name = azurerm_resource_group.network.name
  description         = each.value.description
  severity            = 1
  enabled             = true
  auto_mitigate       = true

  scopes = [data.azurerm_firewall.hub.id]

  frequency   = "PT1M"
  window_size = "PT5M"

  criteria {
    metric_namespace       = "Microsoft.Network/azureFirewalls"
    metric_name            = each.value.metric_name
    aggregation            = "Average"
    operator               = "GreaterThan"
    threshold              = each.value.threshold
    skip_metric_validation = false
  }

  action {
    action_group_id = data.azurerm_monitor_action_group.wallet.id
  }

  tags = local.tags
}
