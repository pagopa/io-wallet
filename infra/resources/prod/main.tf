terraform {

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 3.106.1"
    }

    azuread = {
      source  = "hashicorp/azuread"
      version = "<= 2.50.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfappprodio"
    container_name       = "terraform-state"
    key                  = "iowallet.resources.prod.tfstate"
  }
}

provider "azurerm" {
  features {
  }

  storage_use_azuread = true
}

resource "azurerm_resource_group" "wallet" {
  name     = "${local.project}-wallet-rg-01"
  location = local.location

  tags = local.tags
}

module "key_vaults" {
  source = "../_modules/key_vaults"

  project             = local.project
  location            = local.location
  resource_group_name = azurerm_resource_group.wallet.name

  tenant_id = data.azurerm_client_config.current.tenant_id

  tags = local.tags
}

module "monitoring" {
  source = "../_modules/monitoring"

  project             = local.project
  resource_group_name = azurerm_resource_group.wallet.name

  notification_email = data.azurerm_key_vault_secret.notification_email.value
  notification_slack = data.azurerm_key_vault_secret.notification_slack.value

  tags = local.tags
}

module "cosmos" {
  source = "../_modules/cosmos"

  project             = local.project
  location            = local.location
  secondary_location  = local.secondary_location
  resource_group_name = azurerm_resource_group.wallet.name

  private_endpoint_subnet_id = data.azurerm_subnet.pep.id
  private_link_documents_id  = data.azurerm_private_dns_zone.privatelink_documents.id

  action_group_wallet_id = module.monitoring.action_group_wallet.id
  action_group_io_id     = data.azurerm_monitor_action_group.io.id

  tags = local.tags
}

module "function_apps" {
  source = "../_modules/function_apps"

  prefix              = local.prefix
  env_short           = local.env_short
  location            = local.location
  project             = local.project
  resource_group_name = azurerm_resource_group.wallet.name

  cidr_subnet_user_func_02             = "10.20.19.0/24"
  cidr_subnet_support_func             = "10.20.13.0/24"
  private_endpoint_subnet_id           = data.azurerm_subnet.pep.id
  private_dns_zone_resource_group_name = data.azurerm_resource_group.weu_common.name
  virtual_network = {
    resource_group_name = data.azurerm_virtual_network.vnet_common_itn.resource_group_name
    name                = data.azurerm_virtual_network.vnet_common_itn.name
  }

  cosmos_db_endpoint   = module.cosmos.cosmos_account_wallet.endpoint
  cosmos_database_name = module.cosmos.cosmos_account_wallet.database_name

  storage_account_cdn_name = module.cdn.storage_account_cdn.name

  key_vault_id        = data.azurerm_key_vault.weu_common.id
  key_vault_wallet_id = module.key_vaults.key_vault_wallet.id

  application_insights_connection_string = data.azurerm_application_insights.common.connection_string

  revocation_queue_name = module.storage_accounts.revocation_queue_name.name

  user_func = local.user_func

  nat_gateway_id = data.azurerm_nat_gateway.nat.id

  action_group_wallet_id = module.monitoring.action_group_wallet.id
  action_group_io_id     = data.azurerm_monitor_action_group.io.id

  tags = local.tags
}

module "cdn" {
  source = "../_modules/cdn"

  project             = local.project
  location            = local.location
  resource_group_name = azurerm_resource_group.wallet.name

  log_analytics_workspace_id = data.azurerm_log_analytics_workspace.law.id

  action_group_wallet_id = module.monitoring.action_group_wallet.id
  action_group_io_id     = data.azurerm_monitor_action_group.io.id

  tags = local.tags
}

module "iam" {
  source = "../_modules/iam"

  cosmos_db = {
    id                  = module.cosmos.cosmos_account_wallet.id
    name                = module.cosmos.cosmos_account_wallet.name
    resource_group_name = module.cosmos.cosmos_account_wallet.resource_group_name
    database_name       = module.cosmos.cosmos_account_wallet.database_name
    admin_ids = [
      data.azuread_group.io_developers.object_id,
      data.azuread_group.io_admin.object_id,
    ]
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
    admin_ids = [
      data.azuread_group.io_developers.object_id,
      data.azuread_group.io_admin.object_id,
    ]
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
}

module "apim" {
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
  location        = local.location
  domain          = null
  app_name        = local.domain
  instance_number = "01"

  resource_group_name = azurerm_resource_group.wallet.name

  subnet_pep_id                        = data.azurerm_subnet.pep.id
  private_dns_zone_resource_group_name = data.azurerm_resource_group.weu_common.name
  action_group_id                      = module.monitoring.action_group_wallet.id

  tags = local.tags
}
