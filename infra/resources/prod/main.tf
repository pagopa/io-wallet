terraform {

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }

    azuread = {
      source  = "hashicorp/azuread"
      version = "<= 2.50.0"
    }

    azapi = {
      source  = "azure/azapi"
      version = "~> 2.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "iopitntfst001"
    container_name       = "terraform-state"
    key                  = "io-wallet.resources.prod.tfstate"
    use_azuread_auth     = true
  }
}

provider "azurerm" {
  features {}
  storage_use_azuread = true
}

provider "azapi" {
}

data "azurerm_resource_group" "wallet" {
  name = "${local.project}-wallet-rg-01"
}

module "ids" {
  source = "../_modules/ids"

  project             = local.project
  location            = local.location
  resource_group_name = data.azurerm_resource_group.wallet.name

  tags = local.tags
}

module "key_vaults" {
  source = "../_modules/key_vaults"

  project             = local.project
  location            = local.location
  resource_group_name = data.azurerm_resource_group.wallet.name

  tenant_id = data.azurerm_client_config.current.tenant_id

  key_vault_certificates = {
    id                  = data.azurerm_key_vault.certificates.id
    name                = data.azurerm_key_vault.certificates.name
    resource_group_name = data.azurerm_key_vault.certificates.resource_group_name
  }

  cdn_principal_id = module.cdn.cdn_principal_id

  ci_infra_principal_id = data.azurerm_user_assigned_identity.infra_ci_id.principal_id

  subscription_id = data.azurerm_subscription.current.subscription_id

  tags = local.tags
}

module "monitoring" {
  source = "../_modules/monitoring"

  project             = local.project
  resource_group_name = data.azurerm_resource_group.wallet.name

  notification_email = data.azurerm_key_vault_secret.notification_email.value
  notification_slack = data.azurerm_key_vault_secret.notification_slack.value

  tags = local.tags
}

module "cosmos" {
  source = "../_modules/cosmos"

  project             = local.project
  location            = local.location
  secondary_location  = local.secondary_location
  resource_group_name = data.azurerm_resource_group.wallet.name

  private_endpoint_subnet_id = data.azurerm_subnet.pep.id
  private_link_documents_id  = data.azurerm_private_dns_zone.privatelink_documents.id

  action_group_wallet_id = module.monitoring.action_group_wallet.id
  action_group_io_id     = data.azurerm_monitor_action_group.io.id

  user_assigned_managed_identity_id = module.ids.psn_identity.id
  psn_service_principal_id          = data.azuread_service_principal.psn_app_id.client_id

  tags = local.tags
}

module "function_apps" {
  source = "../_modules/function_apps"

  prefix              = local.prefix
  env_short           = local.env_short
  location            = local.location
  project             = local.project
  resource_group_name = data.azurerm_resource_group.wallet.name

  cidr_subnet_user_func_02  = "10.20.19.0/24"
  cidr_subnet_support_func  = "10.20.13.0/24"
  cidr_subnet_user_pre_func = "10.20.12.0/26"

  private_endpoint_subnet_id           = data.azurerm_subnet.pep.id
  private_dns_zone_resource_group_name = data.azurerm_resource_group.weu_common.name
  virtual_network = {
    resource_group_name = data.azurerm_virtual_network.vnet_common_itn.resource_group_name
    name                = data.azurerm_virtual_network.vnet_common_itn.name
  }

  cosmos_db_endpoint   = module.cosmos.cosmos_account_wallet.endpoint
  cosmos_database_name = module.cosmos.cosmos_account_wallet.database_name

  cosmos_database_name_pre = module.cosmos.cosmos_account_wallet.database_name_pre

  storage_account_cdn_name = module.cdn.storage_account_cdn.name

  key_vault_id          = data.azurerm_key_vault.weu_common.id
  key_vault_wallet_id   = module.key_vaults.key_vault_wallet.id
  key_vault_wallet_name = module.key_vaults.key_vault_wallet.name

  application_insights_connection_string = data.azurerm_application_insights.common.connection_string

  wallet_instance_creation_email_queue_name        = module.storage_accounts.wallet_instance_creation_email_queue_name_01.name
  wallet_instance_revocation_email_queue_name      = module.storage_accounts.wallet_instance_revocation_email_queue_name_01.name
  validate_wallet_instance_certificates_queue_name = module.storage_accounts.revocation_queue_name_02.name

  user_func    = local.user_func
  support_func = local.support_func

  nat_gateway_id = data.azurerm_nat_gateway.nat.id

  action_group_wallet_id = module.monitoring.action_group_wallet.id
  action_group_io_id     = data.azurerm_monitor_action_group.io.id

  tags = local.tags
}

module "cdn" {
  source = "../_modules/cdn"

  project             = local.project
  location            = local.location
  resource_group_name = data.azurerm_resource_group.wallet.name

  log_analytics_workspace_id = data.azurerm_log_analytics_workspace.law.id

  action_group_wallet_id = module.monitoring.action_group_wallet.id
  action_group_io_id     = data.azurerm_monitor_action_group.io.id

  key_vault_certificate_secret_id = data.azurerm_key_vault_certificate.wallet_certificate.versionless_secret_id

  tags = local.tags
}

module "iam" {
  source = "../_modules/iam"

  admin_ids = [
    data.azuread_group.eng_admins.object_id,
    data.azuread_group.wallet_admins.object_id,
  ]

  cicd_principal_ids = {
    infra = {
      ci = data.azurerm_user_assigned_identity.infra_ci_id.principal_id
      cd = data.azurerm_user_assigned_identity.infra_cd_id.principal_id
    }
    app = {
      cd = data.azurerm_user_assigned_identity.app_cd_id.principal_id
    }
  }

  cosmos_db_02 = {
    id                  = module.cosmos.cosmos_account_wallet.id
    name                = module.cosmos.cosmos_account_wallet.name
    resource_group_name = module.cosmos.cosmos_account_wallet.resource_group_name
    database_name       = module.cosmos.cosmos_account_wallet.database_name
  }

  function_app = {
    user_func_02 = {
      principal_id         = module.function_apps.function_app_user_02.principal_id
      staging_principal_id = module.function_apps.function_app_user_02.staging_principal_id
    }
    support_func = {
      principal_id         = module.function_apps.function_app_support.principal_id
      staging_principal_id = module.function_apps.function_app_support.staging_principal_id
    }
  }

  key_vault = {
    id                  = module.key_vaults.key_vault_wallet.id
    name                = module.key_vaults.key_vault_wallet.name
    resource_group_name = module.key_vaults.key_vault_wallet.resource_group_name
  }

  cdn_storage_account = {
    id                  = module.cdn.storage_account_cdn.id
    name                = module.cdn.storage_account_cdn.name
    resource_group_name = module.cdn.storage_account_cdn.resource_group_name
  }

  storage_account = {
    id                  = module.storage_accounts.wallet.id
    name                = module.storage_accounts.wallet.name
    resource_group_name = module.storage_accounts.wallet.resource_group_name
  }

  wallet_dns_zone_id = data.azurerm_dns_zone.wallet_io_pagopa_it.id
}

module "apim_itn" {
  source = "../_modules/apim"

  revision = "v1"

  project_legacy = local.project_legacy
  apim = {
    name                = local.apim.name
    resource_group_name = local.apim.resource_group_name
  }

  function_apps = {
    user_function = {
      function_hostname = module.function_apps.function_app_user_02.default_hostname
    }
    support_function = {
      function_hostname = module.function_apps.function_app_support.default_hostname
    }
  }

  key_vault_id        = data.azurerm_key_vault.weu_common.id
  key_vault_wallet_id = module.key_vaults.key_vault_wallet.id

  product_id = local.apim.products.io_web.product_id

  tags = local.tags
}

module "storage_accounts" {
  source = "../_modules/storage_accounts"

  prefix          = local.prefix
  env_short       = local.env_short
  u_env_short     = local.u_env_short
  location        = local.location
  domain          = ""
  app_name        = local.domain
  instance_number = "01"

  resource_group_name = data.azurerm_resource_group.wallet.name

  subnet_pep_id                        = data.azurerm_subnet.pep.id
  private_dns_zone_resource_group_name = data.azurerm_resource_group.weu_common.name
  action_group_id                      = module.monitoring.action_group_wallet.id

  key_vault_wallet_id = module.key_vaults.key_vault_wallet.id

  tags = local.tags
}

module "dns" {
  source = "../_modules/dns"

  wallet_dns_zone_name                = local.wallet_dns_zone.name
  cdn_endpoint_id                     = module.cdn.cdn_endpoint_id
  wallet_dns_zone_resource_group_name = local.wallet_dns_zone.resource_group_name

  tags = local.tags
}
