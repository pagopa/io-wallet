terraform {
  required_providers {
    azuread = {
      source  = "hashicorp/azuread"
      version = "2.33.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "3.42.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "<= 3.4.0"
    }
  }

  backend "azurerm" {}
}

provider "azurerm" {
  features {}
}

data "azurerm_subscription" "current" {}

data "azurerm_client_config" "current" {}