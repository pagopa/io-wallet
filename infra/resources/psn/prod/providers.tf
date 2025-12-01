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
  features {}
  storage_use_azuread = true
  subscription_id     = "725dede2-879b-45c5-82fa-eb816875b10c"
}

provider "dx" {}
