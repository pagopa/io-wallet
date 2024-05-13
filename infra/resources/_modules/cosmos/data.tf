data "azurerm_private_dns_zone" "privatelink_documents" {
  name                = "privatelink.documents.azure.com"
  resource_group_name = local.resource_group_name_common_legacy
}

data "azurerm_monitor_action_group" "error_action_group" {
  name                = "${replace("${var.project_legacy}", "-", "")}error"
  resource_group_name = local.resource_group_name_common_legacy
}
