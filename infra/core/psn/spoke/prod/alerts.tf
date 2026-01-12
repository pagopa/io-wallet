resource "azurerm_monitor_metric_alert" "vnet_ddos" {
  name                = "pagopa-Prod-ITWallet-spoke-italynorth-DDOSAttackAlert"
  resource_group_name = azurerm_resource_group.networking.name

  description   = "Metric Alert for VNet DDOS Attack"
  severity      = "1"
  enabled       = true
  auto_mitigate = true

  scopes = [
    azurerm_virtual_network.spoke.id
  ]

  frequency   = "PT1M"
  window_size = "PT5M"

  criteria {
    metric_namespace       = "Microsoft.Network/virtualNetworks"
    metric_name            = "ifunderddosattack"
    operator               = "GreaterThan"
    threshold              = 1
    aggregation            = "Maximum"
    skip_metric_validation = false
  }

  tags = local.tags
}
