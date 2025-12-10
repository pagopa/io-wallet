data "azurerm_resource_group" "common_itn" {
  name = "${local.project}-common-rg-01"
}

data "azurerm_virtual_network" "vnet_common_itn" {
  name                = "${local.project}-common-vnet-01"
  resource_group_name = data.azurerm_resource_group.common_itn.name
}

data "azurerm_subnet" "pep" {
  name                 = "${local.project}-pep-snet-01"
  virtual_network_name = data.azurerm_virtual_network.vnet_common_itn.name
  resource_group_name  = data.azurerm_virtual_network.vnet_common_itn.resource_group_name
}

data "azurerm_private_dns_zone" "internal_io_pagopa_it" {
  name                = "internal.io.pagopa.it"
  resource_group_name = "${local.project_legacy}-rg-internal"
}
