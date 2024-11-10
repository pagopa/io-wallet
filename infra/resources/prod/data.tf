data "azurerm_subscription" "current" {}

data "azurerm_client_config" "current" {}

data "azurerm_resource_group" "weu_common" {
  name = "${local.project_legacy}-rg-common"
}

data "azurerm_key_vault" "weu_common" {
  name                = "${local.project_legacy}-kv-common"
  resource_group_name = data.azurerm_resource_group.weu_common.name
}

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
  resource_group_name = data.azurerm_resource_group.weu_common.name
}

data "azuread_group" "io_developers" {
  display_name = format("%s-%s-adgroup-developers", local.prefix, local.env_short)
}

data "azuread_group" "io_admin" {
  display_name = format("%s-%s-adgroup-admin", local.prefix, local.env_short)
}

data "azurerm_application_insights" "common" {
  name                = "${local.project_legacy}-ai-common"
  resource_group_name = data.azurerm_resource_group.weu_common.name
}

data "azurerm_log_analytics_workspace" "law" {
  name                = "${local.project_legacy}-law-common"
  resource_group_name = data.azurerm_resource_group.weu_common.name
}

data "azurerm_nat_gateway" "nat" {
  name                = "${local.project}-ng-01"
  resource_group_name = "${local.project}-common-rg-01"
}

data "azurerm_key_vault_secret" "notification_slack" {
  name         = "slack-wallet-channel-email"
  key_vault_id = module.key_vaults.key_vault_wallet.id
}

data "azurerm_key_vault_secret" "notification_email" {
  name         = "email-wallet"
  key_vault_id = module.key_vaults.key_vault_wallet.id
}

data "azurerm_monitor_action_group" "io" {
  name                = "ioperror"
  resource_group_name = data.azurerm_resource_group.weu_common.name
}
