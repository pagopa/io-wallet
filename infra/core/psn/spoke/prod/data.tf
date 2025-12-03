data "azuread_group" "itwallet" {
  display_name = "pagopa-ITWallet"
}

data "azurerm_private_dns_zone" "blob" {
  provider = azurerm.hub

  name                = "privatelink.blob.core.windows.net"
  resource_group_name = local.networking.hub.resource_group_name
}
