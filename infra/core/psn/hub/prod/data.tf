data "azurerm_client_config" "current" {}

data "azuread_application_published_app_ids" "well_known" {}

data "azurerm_web_application_firewall_policy" "appgw" {
  provider = azurerm.hub

  name                = "pagopa-app-gw-italynorth"
  resource_group_name = azurerm_resource_group.network.name
}

data "azurerm_virtual_network" "hub" {
  provider = azurerm.hub

  name                = "pagopa-hub-italynorth"
  resource_group_name = azurerm_resource_group.network.name
}

data "azurerm_subnet" "hub_gateway_subnet" {
  provider = azurerm.hub

  name                 = "ApplicationGatewaySubnet1"
  virtual_network_name = data.azurerm_virtual_network.hub.name
  resource_group_name  = data.azurerm_virtual_network.hub.resource_group_name
}

data "azurerm_subnet" "dns_inbound" {
  provider = azurerm.hub

  name                 = "AzureDNSInbound"
  virtual_network_name = data.azurerm_virtual_network.hub.name
  resource_group_name  = data.azurerm_virtual_network.hub.resource_group_name
}

data "azurerm_subnet" "dns_outbound" {
  provider = azurerm.hub

  name                 = "AzureDNSOutbound"
  virtual_network_name = data.azurerm_virtual_network.hub.name
  resource_group_name  = data.azurerm_virtual_network.hub.resource_group_name
}

data "azurerm_public_ip" "appgw" {
  provider = azurerm.hub

  name                = "pagopa-ApplicationGW-PublicIp"
  resource_group_name = azurerm_resource_group.network.name
}
