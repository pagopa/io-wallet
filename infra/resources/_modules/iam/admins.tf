# Admins roles
module "admins_roles" {
  for_each = var.admin_ids

  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  principal_id    = each.value
  subscription_id = var.subscription_id

  cosmos = [
    {
      account_name        = var.cosmos_db.name
      resource_group_name = var.cosmos_db.resource_group_name
      database            = var.cosmos_db.database_name
      description         = "Allow admins to manage Cosmos DB"
      role                = "writer"
    }
  ]

  key_vault = [
    {
      name                = var.key_vault_app.name
      resource_group_name = var.key_vault_app.resource_group_name
      has_rbac_support    = true
      description         = "Allow admins to manage application-scoped KeyVault"
      roles = {
        secrets = "owner"
      }
    },
    {
      name                = var.key_vault_certificates.name
      resource_group_name = var.key_vault_certificates.resource_group_name
      has_rbac_support    = var.is_psn
      description         = "Allow admins to manage infrastructure-scoped KeyVault"
      roles = {
        secrets      = "owner",
        certificates = "owner"
      }
    }
  ]

  storage_blob = [
    {
      storage_account_name = var.cdn_storage_account.name
      resource_group_name  = var.cdn_storage_account.resource_group_name
      description          = "Allow admins to manage blobs"
      role                 = "owner"
    },
  ]

  storage_queue = [
    {
      storage_account_name = var.storage_account.name
      resource_group_name  = var.storage_account.resource_group_name
      description          = "Allow admins to send messages to queues"
      role                 = "writer"
    },
    {
      storage_account_name = var.storage_account.name
      resource_group_name  = var.storage_account.resource_group_name
      description          = "Allow admins to read messages from queues"
      role                 = "reader"
    },
    {
      storage_account_name = var.storage_account.name
      resource_group_name  = var.storage_account.resource_group_name
      description          = "Allow admins to manage queues"
      role                 = "owner"
    }
  ]
}
