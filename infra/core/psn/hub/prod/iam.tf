resource "azurerm_user_assigned_identity" "appgateway" {
  provider = azurerm.hub

  name                = "pagopa-app-gw-id-01"
  resource_group_name = azurerm_resource_group.network.name
  location            = azurerm_resource_group.network.location

  tags = local.tags
}
