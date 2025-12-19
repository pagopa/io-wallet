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

data "azurerm_private_dns_zone" "privatelink_blob" {
  name                = "privatelink.blob.core.windows.net"
  resource_group_name = data.azurerm_resource_group.weu_common.name
}

data "azurerm_private_dns_zone" "privatelink_queue" {
  name                = "privatelink.queue.core.windows.net"
  resource_group_name = data.azurerm_resource_group.weu_common.name
}

data "azuread_group" "wallet_admins" {
  display_name = format("%s-%s-adgroup-wallet-admins", local.environment.prefix, local.environment.env_short)
}

data "azuread_group" "eng_admins" {
  display_name = format("%s-%s-adgroup-admin", local.environment.prefix, local.environment.env_short)
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

data "azuread_service_principal" "psn_app_id" {
  display_name = "${local.environment.prefix}-${local.environment.env_short}-psn-hsm-01"
}

data "azurerm_user_assigned_identity" "infra_ci_id" {
  name                = "${local.project}-${local.environment.domain}-infra-github-ci-id-01"
  resource_group_name = data.azurerm_resource_group.wallet.name
}

data "azurerm_user_assigned_identity" "infra_cd_id" {
  name                = "${local.project}-${local.environment.domain}-infra-github-cd-id-01"
  resource_group_name = data.azurerm_resource_group.wallet.name
}

data "azurerm_user_assigned_identity" "app_cd_id" {
  name                = "${local.project}-${local.environment.domain}-app-github-cd-id-01"
  resource_group_name = data.azurerm_resource_group.wallet.name
}

data "azurerm_dns_zone" "io_pagopa_it" {
  name                = "io.pagopa.it"
  resource_group_name = "io-p-rg-external"
}

data "azurerm_dns_zone" "wallet_io_pagopa_it" {
  name                = local.wallet_dns_zone.name
  resource_group_name = local.wallet_dns_zone.resource_group_name
}

data "azurerm_resource_group" "weu_sec" {
  name = "${local.project_legacy}-sec-rg"
}

data "azurerm_key_vault" "certificates" {
  name                = "${local.project_legacy}-kv"
  resource_group_name = data.azurerm_resource_group.weu_sec.name
}

data "azurerm_key_vault_certificate" "wallet_certificate" {
  name         = "wallet-io-pagopa-it"
  key_vault_id = data.azurerm_key_vault.certificates.id
}

data "azurerm_api_management" "platform_api_gateway" {
  name                = "${local.project}-platform-api-gateway-apim-01"
  resource_group_name = "${local.project}-common-rg-01"
}
