output "action_group_wallet" {
  value = {
    id                  = azurerm_monitor_action_group.wallet.id
    name                = azurerm_monitor_action_group.wallet.name
    resource_group_name = azurerm_monitor_action_group.wallet.resource_group_name
  }
}
