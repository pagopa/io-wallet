output "virtual_network" {
  value = {
    id                  = azurerm_virtual_network.spoke.id
    name                = azurerm_virtual_network.spoke.name
    resource_group_name = azurerm_virtual_network.spoke.resource_group_name
  }
}

output "storage_account_terraform" {
  value = {
    id                  = azurerm_storage_account.terraform.id
    name                = azurerm_storage_account.terraform.name
    resource_group_name = azurerm_storage_account.terraform.resource_group_name
  }
}
