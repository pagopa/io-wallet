module "func_app_user" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  principal_id    = var.function_app.user_func.principal_id
  subscription_id = var.subscription_id

  cosmos = [
    {
      account_name        = var.cosmos_db.name
      resource_group_name = var.cosmos_db.resource_group_name
      database            = var.cosmos_db.database_name
      description         = "Allow Function App user to write data to Cosmos DB"
      role                = "writer"
    }
  ]

  key_vault = [
    {
      name                = var.key_vault_app.name
      resource_group_name = var.key_vault_app.resource_group_name
      has_rbac_support    = true
      description         = "Allow Function App user to read secrets from Key Vault"
      roles = {
        secrets = "reader"
      }
    }
  ]

  storage_blob = [
    {
      storage_account_name = var.cdn_storage_account.name
      resource_group_name  = var.cdn_storage_account.resource_group_name
      description          = "Allow Function App user to write blobs to CDN Storage Account"
      role                 = "writer"
    },
    {
      storage_account_name = var.storage_account.name
      resource_group_name  = var.storage_account.resource_group_name
      description          = "Allow Function App user to write blobs to Storage Account"
      role                 = "writer"
    },
  ]

  storage_queue = [
    {
      storage_account_name = var.storage_account.name
      resource_group_name  = var.storage_account.resource_group_name
      description          = "Allow Function App user to send messages to queues"
      role                 = "writer"
    },
    {
      storage_account_name = var.storage_account.name
      resource_group_name  = var.storage_account.resource_group_name
      description          = "Allow Function App user to read messages from queues"
      role                 = "reader"
    },
    {
      storage_account_name = var.storage_account.name
      resource_group_name  = var.storage_account.resource_group_name
      description          = "Allow Function App user to manage queues"
      role                 = "owner"
    }
  ]
}

module "func_app_user_slot" {
  count = var.function_app.user_func.staging_principal_id != null ? 1 : 0

  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  principal_id    = var.function_app.user_func.staging_principal_id
  subscription_id = var.subscription_id

  cosmos = [
    {
      account_name        = var.cosmos_db.name
      resource_group_name = var.cosmos_db.resource_group_name
      database            = var.cosmos_db.database_name
      description         = "Allow Function App user slot to write data to Cosmos DB"
      role                = "writer"
    }
  ]

  key_vault = [
    {
      name                = var.key_vault_app.name
      resource_group_name = var.key_vault_app.resource_group_name
      has_rbac_support    = true
      description         = "Allow Function App user slot to read secrets from Key Vault"
      roles = {
        secrets = "reader"
      }
    }
  ]

  storage_blob = [
    {
      storage_account_name = var.cdn_storage_account.name
      resource_group_name  = var.cdn_storage_account.resource_group_name
      description          = "Allow Function App user slot to write blobs to CDN Storage Account"
      role                 = "writer"
    },
    {
      storage_account_name = var.storage_account.name
      resource_group_name  = var.storage_account.resource_group_name
      description          = "Allow Function App user slot to write blobs to Storage Account"
      role                 = "writer"
    }
  ]

  storage_queue = [
    {
      storage_account_name = var.storage_account.name
      resource_group_name  = var.storage_account.resource_group_name
      description          = "Allow Function App user slot to send messages to queues"
      role                 = "writer"
    },
    {
      storage_account_name = var.storage_account.name
      resource_group_name  = var.storage_account.resource_group_name
      description          = "Allow Function App user slot to read messages from queues"
      role                 = "reader"
    },
    {
      storage_account_name = var.storage_account.name
      resource_group_name  = var.storage_account.resource_group_name
      description          = "Allow Function App user slot to manage queues"
      role                 = "owner"
    }
  ]
}

### Function Support

module "func_app_support" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  principal_id    = var.function_app.support_func.principal_id
  subscription_id = var.subscription_id

  cosmos = [
    {
      account_name        = var.cosmos_db.name
      resource_group_name = var.cosmos_db.resource_group_name
      database            = var.cosmos_db.database_name
      description         = "Allow Function App Support to read data from Cosmos DB"
      role                = "reader"
    }
  ]

  key_vault = [
    {
      name                = var.key_vault_app.name
      resource_group_name = var.key_vault_app.resource_group_name
      has_rbac_support    = true
      description         = "Allow Function App Support to read secrets from Key Vault"
      roles = {
        secrets = "reader"
      }
    }
  ]
}

module "func_app_support_slot" {
  count = var.function_app.support_func.staging_principal_id != null ? 1 : 0

  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  principal_id    = var.function_app.support_func.staging_principal_id
  subscription_id = var.subscription_id

  cosmos = [
    {
      account_name        = var.cosmos_db.name
      resource_group_name = var.cosmos_db.resource_group_name
      database            = var.cosmos_db.database_name
      description         = "Allow Function App Support slot to read data from Cosmos DB"
      role                = "reader"
    }
  ]

  key_vault = [
    {
      name                = var.key_vault_app.name
      resource_group_name = var.key_vault_app.resource_group_name
      has_rbac_support    = true
      description         = "Allow Function App Support slot to read secrets from Key Vault"
      roles = {
        secrets = "reader"
      }
    }
  ]
}

### Function User Uat

module "func_app_user_uat" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  principal_id    = var.function_app.user_func_uat.principal_id
  subscription_id = var.subscription_id

  cosmos = [
    {
      account_name        = var.cosmos_db_uat.name
      resource_group_name = var.cosmos_db_uat.resource_group_name
      database            = var.cosmos_db_uat.database_name
      description         = "Allow Function App user to write data to Cosmos DB"
      role                = "writer"
    }
  ]

  key_vault = [
    {
      name                = var.key_vault_app.name
      resource_group_name = var.key_vault_app.resource_group_name
      has_rbac_support    = true
      description         = "Allow Function App user to read secrets from Key Vault"
      roles = {
        secrets = "reader"
      }
    }
  ]

  storage_blob = [
    {
      storage_account_name = var.storage_account_uat.name
      resource_group_name  = var.storage_account_uat.resource_group_name
      description          = "Allow Function App user slot to write blobs to Storage Account"
      role                 = "writer"
    }
  ]

  storage_queue = [
    {
      storage_account_name = var.storage_account_uat.name
      resource_group_name  = var.storage_account_uat.resource_group_name
      description          = "Allow Function App user slot to send messages to queues"
      role                 = "writer"
    },
    {
      storage_account_name = var.storage_account_uat.name
      resource_group_name  = var.storage_account_uat.resource_group_name
      description          = "Allow Function App user slot to read messages from queues"
      role                 = "reader"
    },
    {
      storage_account_name = var.storage_account_uat.name
      resource_group_name  = var.storage_account_uat.resource_group_name
      description          = "Allow Function App user slot to manage queues"
      role                 = "owner"
    }
  ]
}

module "func_app_user_uat_slot" {
  count = var.function_app.user_func_uat.staging_principal_id != null ? 1 : 0

  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  principal_id    = var.function_app.user_func_uat.staging_principal_id
  subscription_id = var.subscription_id

  cosmos = [
    {
      account_name        = var.cosmos_db_uat.name
      resource_group_name = var.cosmos_db_uat.resource_group_name
      database            = var.cosmos_db_uat.database_name
      description         = "Allow Function App user slot to write data to Cosmos DB"
      role                = "writer"
    }
  ]

  key_vault = [
    {
      name                = var.key_vault_app.name
      resource_group_name = var.key_vault_app.resource_group_name
      has_rbac_support    = true
      description         = "Allow Function App user slot to read secrets from Key Vault"
      roles = {
        secrets = "reader"
      }
    }
  ]

  storage_blob = [
    {
      storage_account_name = var.storage_account_uat.name
      resource_group_name  = var.storage_account_uat.resource_group_name
      description          = "Allow Function App user slot to write blobs to Storage Account"
      role                 = "writer"
    }
  ]

  storage_queue = [
    {
      storage_account_name = var.storage_account_uat.name
      resource_group_name  = var.storage_account_uat.resource_group_name
      description          = "Allow Function App user slot to send messages to queues"
      role                 = "writer"
    },
    {
      storage_account_name = var.storage_account_uat.name
      resource_group_name  = var.storage_account_uat.resource_group_name
      description          = "Allow Function App user slot to read messages from queues"
      role                 = "reader"
    },
    {
      storage_account_name = var.storage_account_uat.name
      resource_group_name  = var.storage_account_uat.resource_group_name
      description          = "Allow Function App user slot to manage queues"
      role                 = "owner"
    }
  ]
}
