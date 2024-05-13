output "resource_group_wallet" {
  value = {
    id       = azurerm_resource_group.resource_group_wallet.id
    name     = azurerm_resource_group.resource_group_wallet.name
    location = azurerm_resource_group.resource_group_wallet.location
  }
}
