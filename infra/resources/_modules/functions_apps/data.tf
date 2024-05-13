data "azurerm_application_insights" "application_insights" {
  name                = "${var.project_legacy}-ai-common"
  resource_group_name = local.resource_group_name_common_legacy
}

data "azurerm_subnet" "snet_github_runner" {
  name                 = "${var.project_legacy}-github-runner-snet"
  virtual_network_name = local.vnet_name_common_legacy
  resource_group_name  = local.resource_group_name_common_legacy
}

data "azurerm_subnet" "snet_apim_v2" {
  name                 = "apimv2api"
  virtual_network_name = local.vnet_name_common_legacy
  resource_group_name  = local.resource_group_name_common_legacy
}

data "azurerm_subnet" "snet_backendl1" {
  name                 = "appbackendl1"
  virtual_network_name = local.vnet_name_common_legacy
  resource_group_name  = local.resource_group_name_common_legacy
}

data "azurerm_subnet" "snet_backendl2" {
  name                 = "appbackendl2"
  virtual_network_name = local.vnet_name_common_legacy
  resource_group_name  = local.resource_group_name_common_legacy
}

data "azurerm_subnet" "snet_backendli" {
  name                 = "appbackendli"
  virtual_network_name = local.vnet_name_common_legacy
  resource_group_name  = local.resource_group_name_common_legacy
}

data "azurerm_private_dns_zone" "privatelink_blob_core" {
  name                = "privatelink.blob.core.windows.net"
  resource_group_name = local.resource_group_name_common_legacy
}

data "azurerm_private_dns_zone" "privatelink_queue_core" {
  name                = "privatelink.queue.core.windows.net"
  resource_group_name = local.resource_group_name_common_legacy
}

data "azurerm_private_dns_zone" "privatelink_table_core" {
  name                = "privatelink.table.core.windows.net"
  resource_group_name = local.resource_group_name_common_legacy
}

data "azurerm_monitor_action_group" "error_action_group" {
  name                = "${replace("${var.project_legacy}", "-", "")}error"
  resource_group_name = local.resource_group_name_common_legacy
}
