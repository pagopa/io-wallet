output "subnet_wallet_function" {
  value = {
    id                  = azurerm_subnet.wallet_func.id
    name                = azurerm_subnet.wallet_func.name
    resource_group_name = azurerm_subnet.wallet_func.resource_group_name
  }
}
