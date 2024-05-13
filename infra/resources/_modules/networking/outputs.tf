output "vnet_common" {
  value = {
    id                  = data.azurerm_virtual_network.vnet_common.id
    name                = data.azurerm_virtual_network.vnet_common.name
    resource_group_name = data.azurerm_virtual_network.vnet_common.resource_group_name
  }
}

output "subnet_pendpoints" {
  value = {
    id   = data.azurerm_subnet.subnet_private_endpoints.id
    name = data.azurerm_subnet.subnet_private_endpoints.name
  }
}

output "subnet_wallet" {
  value = {
    id   = module.subnet.id
    name = module.subnet.name
  }
}
