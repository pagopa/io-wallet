terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>4"
    }

    azuread = {
      source  = "hashicorp/azuread"
      version = "~>3"
    }

    github = {
      source  = "integrations/github"
      version = "~>6"
    }
  }

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "iopitntfst001"
    container_name       = "terraform-state"
    key                  = "io-wallet.repository.tfstate"
  }
}

provider "azurerm" {
  features {
  }
}

provider "github" {
  owner = "pagopa"
}

data "azurerm_subscription" "current" {}

data "azurerm_client_config" "current" {}

data "azurerm_container_app_environment" "runner" {
  name                = local.runner.cae_name
  resource_group_name = local.runner.cae_resource_group_name
}

data "azurerm_api_management" "apim" {
  name                = local.apim.name
  resource_group_name = local.apim.resource_group_name
}

data "azurerm_key_vault" "common" {
  name                = local.key_vault.name
  resource_group_name = local.key_vault.resource_group_name
}

data "azurerm_virtual_network" "common" {
  name                = local.vnet.name
  resource_group_name = local.vnet.resource_group_name
}

data "azurerm_resource_group" "external" {
  name = local.dns.resource_group_name
}

data "azurerm_resource_group" "dashboards" {
  name = "dashboards"
}

data "azuread_group" "admins" {
  display_name = local.adgroups.admins_name
}

data "azuread_group" "developers" {
  display_name = local.adgroups.devs_name
}

import {
  id = local.repository.name
  to = module.repo.github_branch_default.main
}

import {
  id = local.repository.name
  to = module.repo.github_repository.this
}

import {
  id = "${local.repository.name}:${local.repository.default_branch_name}"
  to = module.repo.github_branch_protection.main
}

module "repo" {
  source = "github.com/pagopa/dx//infra/modules/azure_monorepo_single_env_starter_pack?ref=DEVEX-179-produrre-un-modulo-terraform-per-migliorare-la-gestione-dei-permessi-rbac-sui-resource-group"

  environment = {
    prefix          = local.prefix
    env_short       = local.env_short
    location        = local.location
    domain          = local.domain
    instance_number = local.instance_number
  }

  subscription_id = data.azurerm_subscription.current.id
  tenant_id       = data.azurerm_client_config.current.tenant_id

  entraid_groups = {
    admins_object_id = data.azuread_group.admins.object_id
    devs_object_id   = data.azuread_group.developers.object_id
  }

  terraform_storage_account = {
    name                = local.tf_storage_account.name
    resource_group_name = local.tf_storage_account.resource_group_name
  }

  repository = {
    name                     = local.repository.name
    description              = local.repository.description
    topics                   = local.repository.topics
    reviewers_teams          = local.repository.reviewers_teams
    default_branch_name      = local.repository.default_branch_name
    infra_cd_policy_branches = local.repository.infra_cd_policy_branches
    opex_cd_policy_branches  = local.repository.opex_cd_policy_branches
    app_cd_policy_branches   = local.repository.app_cd_policy_branches
  }

  github_private_runner = {
    container_app_environment_id       = data.azurerm_container_app_environment.runner.id
    container_app_environment_location = data.azurerm_container_app_environment.runner.location
    key_vault = {
      name                = local.runner.secret.kv_name
      resource_group_name = local.runner.secret.kv_resource_group_name
    }
  }

  apim_id                    = data.azurerm_api_management.apim.id
  pep_vnet_id                = data.azurerm_virtual_network.common.id
  dns_zone_resource_group_id = data.azurerm_resource_group.external.id
  opex_resource_group_id     = data.azurerm_resource_group.dashboards.id
  keyvault_common_ids = [
    data.azurerm_key_vault.common.id
  ]

  tags = local.tags
}
