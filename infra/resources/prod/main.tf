terraform {

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 3.104.0"
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

  tags = local.tags
}

module "networking" {
  source = "../_modules/networking"

  project              = local.project
  location             = local.location
  resource_group_name  = data.azurerm_virtual_network.vnet_common_itn.resource_group_name
  virtual_network_name = data.azurerm_virtual_network.vnet_common_itn.name

  # inferred from vnet-common with cidr 10.20.0.0/16
  cidr_subnet_func_wallet = "10.20.0.0/24"

  tags = local.tags
}
