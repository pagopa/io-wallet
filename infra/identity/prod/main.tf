terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 3.105.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfappprodio"
    container_name       = "terraform-state"
    key                  = "iowallet.identity.tfstate"
  }
}

provider "azurerm" {
  features {
  }
}

module "federated_identities" {
  source = "github.com/pagopa/dx//infra/modules/azure_federated_identity_with_github?ref=main"

  prefix    = local.prefix
  env_short = local.env_short
  env       = local.env
  domain    = local.domain

  repositories = [local.repo_name]

  continuos_integration = {
    enable = true
    roles = {
      subscription = [
        "Reader",
        "Reader and Data Access",
        "PagoPA IaC Reader",
        "DocumentDB Account Contributor"
      ]
      resource_groups = {
        terraform-state-rg = [
          "Storage Blob Data Contributor"
        ]
        io-p-itn-wallet-rg-01 = [
          "Key Vault Reader",
          "Key Vault Crypto User",
          "Key Vault Secrets User",
        ]
      }
    }
  }

  continuos_delivery = {
    enable = true
    roles = {
      subscription = ["Contributor"]
      resource_groups = {
        terraform-state-rg = [
          "Storage Blob Data Contributor"
        ]
        io-p-itn-wallet-rg-01 = [
          "Key Vault Administrator",
          "Key Vault Crypto Officer",
          "Key Vault Secrets Officer",
          "Role Based Access Control Administrator",
        ]
      }
    }
  }

  tags = local.tags
}

module "app_federated_identities" {
  source = "github.com/pagopa/dx//infra/modules/azure_federated_identity_with_github?ref=main"

  continuos_integration = { enable = false }

  prefix    = local.prefix
  env_short = local.env_short
  env       = "app-${local.env}"
  domain    = "${local.domain}-app"

  repositories = [local.repo_name]

  tags = local.tags
}

resource "azurerm_key_vault_access_policy" "ci" {
  key_vault_id = data.azurerm_key_vault.weu_common.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = module.federated_identities.federated_ci_identity.id

  secret_permissions = ["Get", "List"]
}

resource "azurerm_key_vault_access_policy" "cd" {
  key_vault_id = data.azurerm_key_vault.weu_common.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = module.federated_identities.federated_cd_identity.id

  secret_permissions = ["Get", "List", "Set"]
}

module "opex_federated_identities" {
  source = "github.com/pagopa/dx//infra/modules/azure_federated_identity_with_github?ref=main"

  prefix    = local.prefix
  env_short = local.env_short
  env       = "opex-${local.env}"
  domain    = "${local.domain}-opex"

  repositories = [local.repo_name]

  continuos_integration = {
    enable = true
    roles = {
      subscription = ["Reader"]
      resource_groups = {
        dashboards = [
          "Reader"
        ],
        terraform-state-rg = [
          "Storage Blob Data Reader",
          "Reader and Data Access",
          "PagoPA IaC Reader",
        ]
      }
    }
  }

  continuos_delivery = {
    enable = true
    roles = {
      subscription = ["Reader"]
      resource_groups = {
        dashboards = [
          "Contributor"
        ],
        terraform-state-rg = [
          "Storage Blob Data Contributor",
          "Reader and Data Access"
        ]
      }
    }
  }

  tags = local.tags
}
