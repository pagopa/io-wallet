data "azurerm_virtual_network" "hub" {
  provider = azurerm.hub

  name                = "pagopa-hub-italynorth"
  resource_group_name = "pagopa-rg-hub-network-italynorth"
}

data "azurerm_subnet" "hub_gateway_subnet" {
  provider = azurerm.hub

  name                 = "ApplicationGatewaySubnet"
  virtual_network_name = data.azurerm_virtual_network.hub.name
  resource_group_name  = data.azurerm_virtual_network.hub.resource_group_name
}

data "azurerm_public_ip" "appgw" {
  provider = azurerm.hub

  name                = "pagopa-ApplicationGW-PublicIp"
  resource_group_name = "pagopa-rg-hub-network-italynorth"
}
