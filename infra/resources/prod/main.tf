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

resource "azurerm_resource_group" "resource_group_wallet" {
  name     = "${local.project}-wallet-rg-01"
  location = local.location

  tags = local.tags
}
