terraform {

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 3.97.1"
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
