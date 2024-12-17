terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 3.117.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfappprodio"
    container_name       = "terraform-state"
    key                  = "iowallet.github-runner.tfstate"
  }
}

provider "azurerm" {
  features {
  }
}

data "azurerm_resource_group" "wallet" {
  name = "${local.project}-wallet-rg-01"
}

data "azurerm_container_app_environment" "runner" {
  name                = "${local.project}-github-runner-cae-01"
  resource_group_name = "${local.project}-github-runner-rg-01"
}

module "container_app_job_selfhosted_runner" {
  source = "github.com/pagopa/dx//infra/modules/github_selfhosted_runner_on_container_app_jobs?ref=main"

  resource_group_name = data.azurerm_resource_group.wallet.name

  environment = {
    prefix          = local.prefix
    env_short       = local.env_short
    location        = local.location
    instance_number = "01"
  }

  repository = {
    name = local.repo_name
  }

  container_app_environment = {
    id                  = data.azurerm_container_app_environment.runner.id
    location            = data.azurerm_container_app_environment.runner.location
    name                = data.azurerm_container_app_environment.runner.name
    resource_group_name = data.azurerm_container_app_environment.runner.resource_group_name
  }

  key_vault = {
    name                = "${local.prefix}-${local.env_short}-kv-common"
    resource_group_name = "${local.prefix}-${local.env_short}-rg-common"
  }

  tags = local.tags
}
