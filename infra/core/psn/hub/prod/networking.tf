resource "azurerm_virtual_network_peering" "hub_to_spoke" {
  provider = azurerm.hub

  name                      = "peer-to-pagopa-Prod-ITWallet-spoke-italynorth"
  resource_group_name       = data.azurerm_virtual_network.hub.resource_group_name
  virtual_network_name      = data.azurerm_virtual_network.hub.name
  remote_virtual_network_id = local.spoke_vnet_id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  allow_gateway_transit        = true
}

resource "azurerm_private_dns_zone_virtual_network_link" "hub" {
  provider = azurerm.hub

  for_each = toset(local.private_dns_zones_hub_links)

  name                  = data.azurerm_virtual_network.hub.name
  private_dns_zone_name = each.value
  resource_group_name   = data.azurerm_virtual_network.hub.resource_group_name
  virtual_network_id    = data.azurerm_virtual_network.hub.id

  tags = local.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "spoke" {
  provider = azurerm.hub

  for_each = toset(local.private_dns_zones_spoke_links)

  name                  = local.spoke_vnet_name
  private_dns_zone_name = each.value
  resource_group_name   = data.azurerm_virtual_network.hub.resource_group_name
  virtual_network_id    = local.spoke_vnet_id

  tags = local.tags
}

resource "azurerm_subnet" "private_links" {
  name                 = "AzurePl"
  resource_group_name  = data.azurerm_virtual_network.hub.resource_group_name
  virtual_network_name = data.azurerm_virtual_network.hub.name

  address_prefixes = ["10.251.1.64/27"]

  private_link_service_network_policies_enabled = false
}
