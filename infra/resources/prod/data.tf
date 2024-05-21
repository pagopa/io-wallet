data "azurerm_subscription" "current" {}

data "azurerm_client_config" "current" {}

data "azurerm_virtual_network" "vnet_common_itn" {
  name                = "${local.project}-common-vnet-01"
  resource_group_name = "${local.project}-common-rg-01"
}

data "azurerm_subnet" "pep" {
  name                 = "${local.project}-pep-snet-01"
  virtual_network_name = data.azurerm_virtual_network.vnet_common_itn.name
  resource_group_name  = data.azurerm_virtual_network.vnet_common_itn.resource_group_name
}

data "azurerm_private_dns_zone" "privatelink_documents" {
  name                = "privatelink.documents.azure.com"
  resource_group_name = "${local.project_legacy}-rg-common"
}

data "azuread_group" "io_admin" {
  display_name = format("%s-%s-adgroup-admin", local.prefix, local.env_short)
}

data "azurerm_application_insights" "common" {
  name                = "${local.project_legacy}-ai-common"
  resource_group_name = "${local.project_legacy}-rg-common"
}
