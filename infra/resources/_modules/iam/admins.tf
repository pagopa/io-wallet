# Admins roles
module "admins_roles" {
  for_each     = var.cosmos_db_02.admin_ids
  source       = "github.com/pagopa/dx//infra/modules/azure_role_assignments?ref=main"
  principal_id = each.value

  cosmos = [
    {
      account_name        = var.cosmos_db_02.name
      resource_group_name = var.cosmos_db_02.resource_group_name
      database            = var.cosmos_db_02.database_name
      role                = "writer"
    }
  ]

  key_vault = [
    {
      name                = var.key_vault.name
      resource_group_name = var.key_vault.resource_group_name
      roles = {
        secrets = "owner"
      }
    }
  ]

  storage_blob = [
    {
      storage_account_name = var.cdn_storage_account.name
      resource_group_name  = var.cdn_storage_account.resource_group_name
      role                 = "owner"
    }
  ]

  storage_queue = [
    {
      storage_account_name = var.storage_account.name
      resource_group_name  = var.storage_account.resource_group_name
      role                 = "writer"
    },
    {
      storage_account_name = var.storage_account.name
      resource_group_name  = var.storage_account.resource_group_name
      role                 = "reader"
    },
    {
      storage_account_name = var.storage_account.name
      resource_group_name  = var.storage_account.resource_group_name
      role                 = "owner"
    }
  ]
}
