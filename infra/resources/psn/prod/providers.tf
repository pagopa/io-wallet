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

    dx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "iw-p-itn-terraform-rg-01"
    storage_account_name = "iwpitntfst01"
    container_name       = "terraform-state"
    key                  = "iw.resources.psn.prod.tfstate"
    use_azuread_auth     = true
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_deleted_certificates_on_destroy = true
      recover_soft_deleted_certificates          = true
    }
  }
  storage_use_azuread = true
  subscription_id     = "725dede2-879b-45c5-82fa-eb816875b10c"
}

provider "azurerm" {
  features {}
  alias                           = "hub"
  storage_use_azuread             = true
  resource_provider_registrations = "none"
  subscription_id                 = "f3c27dbc-5c86-4c14-b43f-9faed77e5e19"
}

provider "azurerm" {
  features {}
  alias                           = "io"
  storage_use_azuread             = true
  resource_provider_registrations = "none"
  subscription_id                 = "ec285037-c673-4f58-b594-d7c480da4e8b"
}

provider "dx" {}
