module "func_app_user_02" {
  source       = "github.com/pagopa/dx//infra/modules/azure_role_assignments?ref=main"
  principal_id = var.function_app.user_func_02.principal_id

  cosmos = [
    {
      account_name        = var.cosmos_db.name
      resource_group_name = var.cosmos_db.resource_group_name
      database            = var.cosmos_db.database_name
      role                = "writer"
    }
  ]

  key_vault = [
    {
      name                = var.key_vault.name
      resource_group_name = var.key_vault.resource_group_name
      roles = {
        secrets = "reader"
      }
    }
  ]

  storage_blob = [
    {
      storage_account_name = var.cdn_storage_account.name
      resource_group_name  = var.cdn_storage_account.resource_group_name
      role                 = "writer"
    }
  ]
}

module "func_app_user_slot_02" {
  count        = var.function_app.user_func_02.staging_principal_id != null ? 1 : 0
  source       = "github.com/pagopa/dx//infra/modules/azure_role_assignments?ref=main"
  principal_id = var.function_app.user_func_02.staging_principal_id

  cosmos = [
    {
      account_name        = var.cosmos_db.name
      resource_group_name = var.cosmos_db.resource_group_name
      database            = var.cosmos_db.database_name
      role                = "writer"
    }
  ]

  key_vault = [
    {
      name                = var.key_vault.name
      resource_group_name = var.key_vault.resource_group_name
      roles = {
        secrets = "reader"
      }
    }
  ]

  storage_blob = [
    {
      storage_account_name = var.cdn_storage_account.name
      resource_group_name  = var.cdn_storage_account.resource_group_name
      role                 = "writer"
    }
  ]
}

### Function Support

module "func_app_support" {
  source       = "github.com/pagopa/dx//infra/modules/azure_role_assignments?ref=main"
  principal_id = var.function_app.support_func.principal_id

  cosmos = [
    {
      account_name        = var.cosmos_db.name
      resource_group_name = var.cosmos_db.resource_group_name
      database            = var.cosmos_db.database_name
      role                = "reader"
    }
  ]

  key_vault = [
    {
      name                = var.key_vault.name
      resource_group_name = var.key_vault.resource_group_name
      roles = {
        secrets = "reader"
      }
    }
  ]
}

module "func_app_support_slot" {
  count        = var.function_app.support_func.staging_principal_id != null ? 1 : 0
  source       = "github.com/pagopa/dx//infra/modules/azure_role_assignments?ref=main"
  principal_id = var.function_app.support_func.staging_principal_id

  cosmos = [
    {
      account_name        = var.cosmos_db.name
      resource_group_name = var.cosmos_db.resource_group_name
      database            = var.cosmos_db.database_name
      role                = "reader"
    }
  ]

  key_vault = [
    {
      name                = var.key_vault.name
      resource_group_name = var.key_vault.resource_group_name
      roles = {
        secrets = "reader"
      }
    }
  ]
}
