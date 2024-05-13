data "azurerm_virtual_network" "vnet_common" {
  name                = "${var.project}-common-vnet-01"
  resource_group_name = local.resource_group_common
}

data "azurerm_virtual_network" "vnet_common_legacy" {
  name                = "${var.project_legacy}-vnet-common"
  resource_group_name = local.resource_group_common_legacy
}

data "azurerm_subnet" "subnet_private_endpoints" {
  name                 = "${var.project}-pep-snet-01"
  resource_group_name  = data.azurerm_virtual_network.vnet_common.resource_group_name
  virtual_network_name = data.azurerm_virtual_network.vnet_common.name
}
