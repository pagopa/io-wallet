data "azuread_group" "itwallet" {
  display_name = "pagopa-ITWallet"
}

data "azurerm_private_dns_zone" "blob" {
  provider = azurerm.hub

  name                = "privatelink.blob.core.windows.net"
  resource_group_name = local.networking.hub.resource_group_name
}

data "azurerm_private_dns_zone" "monitor" {
  provider = azurerm.hub

  name                = "privatelink.monitor.azure.com"
  resource_group_name = local.networking.hub.resource_group_name
}

data "azurerm_private_dns_zone" "oms" {
  provider = azurerm.hub

  name                = "privatelink.oms.opinsights.azure.com"
  resource_group_name = local.networking.hub.resource_group_name
}

data "azurerm_private_dns_zone" "ods" {
  provider = azurerm.hub

  name                = "privatelink.ods.opinsights.azure.com"
  resource_group_name = local.networking.hub.resource_group_name
}

data "azurerm_private_dns_zone" "agentsvc" {
  provider = azurerm.hub

  name                = "privatelink.agentsvc.azure-automation.net"
  resource_group_name = local.networking.hub.resource_group_name
}
