resource "azurerm_virtual_network_peering" "hub_to_spoke" {
  provider = azurerm.hub

  name                      = "peer-to-pagopa-Prod-ITWallet-spoke-italynorth"
  resource_group_name       = data.azurerm_virtual_network.hub.resource_group_name
  virtual_network_name      = data.azurerm_virtual_network.hub.name
  remote_virtual_network_id = "/subscriptions/725dede2-879b-45c5-82fa-eb816875b10c/resourceGroups/pagopa-Prod-ITWallet-rg-spoke-italynorth/providers/Microsoft.Network/virtualNetworks/pagopa-Prod-ITWallet-spoke-italynorth"

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
}
