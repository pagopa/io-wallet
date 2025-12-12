resource "azurerm_private_dns_zone" "kv" {
  provider = azurerm.hub

  name                = "privatelink.vaultcore.azure.net"
  resource_group_name = data.azurerm_virtual_network.hub.resource_group_name

  tags = local.tags
}

resource "azurerm_private_dns_zone" "hsm" {
  provider = azurerm.hub

  name                = "privatelink.managedhsm.azure.net"
  resource_group_name = data.azurerm_virtual_network.hub.resource_group_name

  tags = local.tags
}

resource "azurerm_private_dns_zone" "cosno" {
  provider = azurerm.hub

  name                = "privatelink.documents.azure.com"
  resource_group_name = data.azurerm_virtual_network.hub.resource_group_name

  tags = local.tags
}

resource "azurerm_private_dns_zone" "asp" {
  provider = azurerm.hub

  name                = "privatelink.azurewebsites.net"
  resource_group_name = data.azurerm_virtual_network.hub.resource_group_name

  tags = local.tags
}

resource "azurerm_private_dns_zone" "blob" {
  provider = azurerm.hub

  name                = "privatelink.blob.core.windows.net"
  resource_group_name = data.azurerm_virtual_network.hub.resource_group_name

  tags = local.tags
}

resource "azurerm_private_dns_zone" "queue" {
  provider = azurerm.hub

  name                = "privatelink.queue.core.windows.net"
  resource_group_name = data.azurerm_virtual_network.hub.resource_group_name

  tags = local.tags
}

resource "azurerm_private_dns_zone" "table" {
  provider = azurerm.hub

  name                = "privatelink.table.core.windows.net"
  resource_group_name = data.azurerm_virtual_network.hub.resource_group_name

  tags = local.tags
}

resource "azurerm_private_dns_zone" "containerapp_itn" {
  provider = azurerm.hub

  name                = "privatelink.italynorth.azurecontainerapps.io"
  resource_group_name = data.azurerm_virtual_network.hub.resource_group_name

  tags = local.tags
}

resource "azurerm_private_dns_zone" "acr" {
  provider = azurerm.hub

  name                = "privatelink.azurecr.io"
  resource_group_name = data.azurerm_virtual_network.hub.resource_group_name

  tags = local.tags
}

resource "azurerm_private_dns_zone" "monitor" {
  provider = azurerm.hub

  name                = "privatelink.monitor.azure.com"
  resource_group_name = data.azurerm_virtual_network.hub.resource_group_name

  tags = local.tags
}

resource "azurerm_private_dns_zone" "oms" {
  provider = azurerm.hub

  name                = "privatelink.oms.opinsights.azure.com"
  resource_group_name = data.azurerm_virtual_network.hub.resource_group_name

  tags = local.tags
}

resource "azurerm_private_dns_zone" "ods" {
  provider = azurerm.hub

  name                = "privatelink.ods.opinsights.azure.com"
  resource_group_name = data.azurerm_virtual_network.hub.resource_group_name

  tags = local.tags
}

resource "azurerm_private_dns_zone" "agentsvc" {
  provider = azurerm.hub

  name                = "privatelink.agentsvc.azure-automation.net"
  resource_group_name = data.azurerm_virtual_network.hub.resource_group_name

  tags = local.tags
}

resource "azurerm_private_dns_zone" "azure_api_net" {
  provider = azurerm.hub

  name                = "azure-api.net"
  resource_group_name = data.azurerm_virtual_network.hub.resource_group_name

  tags = local.tags
}

resource "azurerm_private_dns_zone" "management_azure_api_net" {
  provider = azurerm.hub

  name                = "management.azure-api.net"
  resource_group_name = data.azurerm_virtual_network.hub.resource_group_name

  tags = local.tags
}

resource "azurerm_private_dns_zone" "scm_azure_api_net" {
  provider = azurerm.hub

  name                = "scm.azure-api.net"
  resource_group_name = data.azurerm_virtual_network.hub.resource_group_name

  tags = local.tags
}
