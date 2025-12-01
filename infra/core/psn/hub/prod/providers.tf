terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }

    dx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "iw-p-itn-terraform-rg-01"
    storage_account_name = "iwpitntfst01"
    container_name       = "terraform-state"
    key                  = "iw.core.psn.hub.prod.tfstate"
    use_azuread_auth     = true
  }
}

provider "azurerm" {
  features {}
  subscription_id     = "725dede2-879b-45c5-82fa-eb816875b10c"
  storage_use_azuread = true
}

provider "azurerm" {
  features {}
  alias                           = "hub"
  subscription_id                 = "f3c27dbc-5c86-4c14-b43f-9faed77e5e19"
  resource_provider_registrations = "none"
  storage_use_azuread             = true
}

provider "dx" {}
