resource "azurerm_resource_group" "network" {
  provider = azurerm.hub

  name     = "pagopa-rg-hub-network-italynorth"
  location = "italynorth"

  tags = local.tags
}
