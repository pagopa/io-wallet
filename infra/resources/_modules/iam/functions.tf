module "func_app_user_02" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 0.0"

  principal_id = var.function_app.user_func_02.principal_id

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
  count = var.function_app.user_func_02.staging_principal_id != null ? 1 : 0

  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 0.0"

  principal_id = var.function_app.user_func_02.staging_principal_id

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
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 0.0"

  principal_id = var.function_app.support_func.principal_id

  cosmos = [
    {
      account_name        = var.cosmos_db_02.name
      resource_group_name = var.cosmos_db_02.resource_group_name
      database            = var.cosmos_db_02.database_name
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
  count = var.function_app.support_func.staging_principal_id != null ? 1 : 0

  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 0.0"

  principal_id = var.function_app.support_func.staging_principal_id

  cosmos = [
    {
      account_name        = var.cosmos_db_02.name
      resource_group_name = var.cosmos_db_02.resource_group_name
      database            = var.cosmos_db_02.database_name
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

### Function User Uat

module "func_app_user_uat" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 0.0"

  principal_id = var.function_app.user_func_uat.principal_id

  cosmos = [
    {
      account_name        = var.cosmos_db_uat.name
      resource_group_name = var.cosmos_db_uat.resource_group_name
      database            = var.cosmos_db_uat.database_name
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
}

module "func_app_user_uat_slot" {
  count = var.function_app.user_func_uat.staging_principal_id != null ? 1 : 0

  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 0.0"

  principal_id = var.function_app.user_func_uat.staging_principal_id

  cosmos = [
    {
      account_name        = var.cosmos_db_uat.name
      resource_group_name = var.cosmos_db_uat.resource_group_name
      database            = var.cosmos_db_uat.database_name
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
}
