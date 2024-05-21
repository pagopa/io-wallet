terraform {

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 3.104.0"
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

  key_vault_admin_ids = [data.azuread_group.io_admin.object_id]

  tags = local.tags
}

module "cosmos" {
  source = "../_modules/cosmos"

  project             = local.project
  location            = local.location
  secondary_location  = local.secondary_location
  resource_group_name = azurerm_resource_group.wallet.name

  key_vault = {
    id                 = module.key_vaults.key_vault_wallet.id
    key_versionless_id = module.key_vaults.key_vault_cosmos_key.versionless_id
  }

  private_endpoint_subnet_id = data.azurerm_subnet.pep.id
  private_link_documents_id  = data.azurerm_private_dns_zone.privatelink_documents.id

  tags = local.tags
}

module "function_apps" {
  source = "../_modules/function_apps"

  prefix              = local.prefix
  env_short           = local.env_short
  location            = local.location
  resource_group_name = azurerm_resource_group.wallet.name

  cidr_subnet_func_wallet    = "10.20.0.0/24"
  private_endpoint_subnet_id = data.azurerm_subnet.pep.id
  virtual_network = {
    resource_group_name = data.azurerm_virtual_network.vnet_common_itn.resource_group_name
    name                = data.azurerm_virtual_network.vnet_common_itn.name
  }

  application_insights_connection_string = data.azurerm_application_insights.common.connection_string

  cosmos_db = {
    endpoint = module.cosmos.cosmos_account_wallet.endpoint
    name     = module.cosmos.cosmos_account_wallet.name
  }

  tags = local.tags
}
