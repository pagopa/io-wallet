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

module "cosmos" {
  source = "../_modules/cosmos"

  project             = local.project
  location            = local.location
  secondary_location  = local.secondary_location
  resource_group_name = azurerm_resource_group.wallet.name

  private_endpoint_subnet_id = data.azurerm_subnet.pep.id
  private_link_documents_id  = data.azurerm_private_dns_zone.privatelink_documents.id

  tags = local.tags
}

module "function_apps" {
  source = "../_modules/function_apps"

  prefix              = local.prefix
  env_short           = local.env_short
  location            = local.location
  project             = local.project
  resource_group_name = azurerm_resource_group.wallet.name

  cidr_subnet_user_func                = "10.20.0.0/24"
  cidr_subnet_support_func             = "10.20.13.0"
  private_endpoint_subnet_id           = data.azurerm_subnet.pep.id
  private_dns_zone_resource_group_name = data.azurerm_resource_group.weu-common.name
  virtual_network = {
    resource_group_name = data.azurerm_virtual_network.vnet_common_itn.resource_group_name
    name                = data.azurerm_virtual_network.vnet_common_itn.name
  }

  cosmos_db_endpoint    = module.cosmos.cosmos_account_wallet.endpoint
  cosmos_db_key         = module.cosmos.cosmos_account_wallet.primary_key
  cosmos_database_names = module.cosmos.cosmos_account_wallet.database_names

  storage_account_cdn_name = module.cdn.storage_account_cdn.name

  key_vault_id        = data.azurerm_key_vault.weu-common.id
  key_vault_wallet_id = module.key_vaults.key_vault_wallet.id

  application_insights_connection_string = data.azurerm_application_insights.common.connection_string

  tags = local.tags

  user_func = local.user_func

  nat_gateway_id_support_func = data.azurerm_nat_gateway.nat.id
}

module "cdn" {
  source = "../_modules/cdn"

  project             = local.project
  location            = local.location
  resource_group_name = azurerm_resource_group.wallet.name

  log_analytics_workspace_id = data.azurerm_log_analytics_workspace.law.id

  tags = local.tags
}

module "iam" {
  source = "../_modules/iam"

  cosmos_db = {
    id                  = module.cosmos.cosmos_account_wallet.id
    name                = module.cosmos.cosmos_account_wallet.name
    resource_group_name = module.cosmos.cosmos_account_wallet.resource_group_name
    database_names      = module.cosmos.cosmos_account_wallet.database_names
    admin_ids = [
      data.azuread_group.io_developers.object_id,
      data.azuread_group.io_admin.object_id,
    ]
  }

  function_app = {
    principal_id         = module.function_apps.function_app_user.principal_id
    staging_principal_id = module.function_apps.function_app_user.staging_principal_id
  }

  key_vault = {
    id = module.key_vaults.key_vault_wallet.id
    admin_ids = [
      data.azuread_group.io_developers.object_id,
      data.azuread_group.io_admin.object_id,
    ]
  }

  cdn_storage_account_id = module.cdn.storage_account_cdn.id
}

module "apim" {
  source = "../_modules/apim"

  revision = "v1"

  project_legacy = local.project_legacy
  apim = {
    name                = local.apim.name
    resource_group_name = local.apim.resource_group_name
  }

  user_function = {
    function_hostname = module.function_apps.function_app_user.default_hostname
  }

  key_vault_id = data.azurerm_key_vault.weu-common.id

  product_id = local.apim.products.io_web.product_id

  tags = local.tags
}
