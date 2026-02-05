# Admins roles
locals {
  admin_ids = toset([
    data.azuread_group.eng_admins.object_id,
    data.azuread_group.wallet_admins.object_id,
  ])
}

module "admins_roles" {
  for_each = local.admin_ids

  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  principal_id    = each.value
  subscription_id = data.azurerm_subscription.current.subscription_id

  cosmos = [
    {
      account_name        = module.cosmos.apps.name
      resource_group_name = module.cosmos.apps.resource_group_name
      database            = module.cosmos.apps.database_name
      description         = "Allow admins to manage Cosmos DB"
      role                = "writer"
    },
    {
      account_name        = module.cosmos.apps.name
      resource_group_name = module.cosmos.apps.resource_group_name
      database            = module.cosmos.apps.database_name_uat
      description         = "Allow admins to manage Cosmos DB"
      role                = "writer"
    }
  ]

  key_vault = [
    {
      name                = module.key_vaults.key_vault_wallet.name
      resource_group_name = module.key_vaults.key_vault_wallet.resource_group_name
      has_rbac_support    = true
      description         = "Allow admins to manage application-scoped KeyVault"
      roles = {
        secrets = "owner"
      }
    },
    {
      name                = data.azurerm_key_vault.certificates.name
      resource_group_name = data.azurerm_key_vault.certificates.resource_group_name
      has_rbac_support    = false
      description         = "Allow admins to manage infrastructure-scoped KeyVault"
      roles = {
        secrets      = "owner",
        certificates = "owner"
      }
    }
  ]
}

# CI/CD roles

resource "azurerm_role_assignment" "infra_cd_subscription_rbac_admin" {
  scope                = data.azurerm_dns_zone.wallet_io_pagopa_it.id
  role_definition_name = "DNS Zone Contributor"
  principal_id         = data.azurerm_user_assigned_identity.infra_cd_id.principal_id
  description          = "Allow io-wallet Infra CD identity to manage the wallet DNS zone"
}

module "key_vault_certificate_infra_ci" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  principal_id    = data.azurerm_user_assigned_identity.infra_ci_id.principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  key_vault = [{
    name                = data.azurerm_key_vault.certificates.name
    resource_group_name = data.azurerm_key_vault.certificates.resource_group_name
    has_rbac_support    = false
    description         = "It is required so CI workflow can get the certificates stored in the key vault"

    roles = {
      certificates = "reader"
      secrets      = "reader"
    }
  }]
}

module "key_vault_certificate_infra_cd" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  principal_id    = data.azurerm_user_assigned_identity.infra_cd_id.principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  key_vault = [{
    name                = data.azurerm_key_vault.certificates.name
    resource_group_name = data.azurerm_key_vault.certificates.resource_group_name
    has_rbac_support    = false
    description         = "It is required so CD workflow can manage the certificates stored in the key vault"

    roles = {
      certificates = "reader"
      secrets      = "reader"
    }
  }]
}
