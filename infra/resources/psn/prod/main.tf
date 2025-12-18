module "ids" {
  source = "../../_modules/identities"

  environment = merge(local.environment, {
    name = "data-cmk"
  })
  resource_group_name = data.azurerm_resource_group.wallet.name

  tags = local.tags
}

module "key_vault_app" {
  source = "../../_modules/key_vaults"

  environment = merge(local.environment,
    {
      name = "apps"
    }
  )
  resource_group_name = data.azurerm_resource_group.wallet.name

  tenant_id = data.azurerm_client_config.current.tenant_id

  private_endpoint = {
    subnet_pep_id             = data.azurerm_subnet.pep.id
    private_dns_zone_group_id = data.azurerm_private_dns_zone.kv.id
  }

  tags = local.tags
}

module "key_vault_infra" {
  source = "../../_modules/key_vaults"

  environment = merge(local.environment,
    {
      name = "infra"
    }
  )
  resource_group_name = data.azurerm_resource_group.wallet.name

  tenant_id = data.azurerm_client_config.current.tenant_id

  tags = local.tags
}

module "monitoring" {
  source = "../../_modules/monitoring"

  project             = local.project
  resource_group_name = data.azurerm_resource_group.wallet.name

  display_name = "Wallet Group"

  notification_email = data.azurerm_key_vault_secret.notification_email.value
  notification_slack = data.azurerm_key_vault_secret.notification_slack.value

  tags = local.tags
}

module "storage_accounts" {
  source = "../../_modules/storage_accounts"

  environment = merge(local.environment,
    {
      name = "apps"
    }
  )

  u_env_short         = "u"
  resource_group_name = data.azurerm_resource_group.wallet.name

  private_endpoint = {
    blob_private_dns_zone_id  = data.azurerm_private_dns_zone.blob.id
    queue_private_dns_zone_id = data.azurerm_private_dns_zone.queue.id
    subnet_pep_id             = data.azurerm_subnet.pep.id
  }

  key_vault_wallet_id = module.key_vault_app.key_vault_wallet.id

  action_group_id = module.monitoring.action_group_wallet.id

  user_assigned_managed_identity_id = module.ids.psn_identity.id
  customer_managed_key_url          = local.hsm_key_url

  tags = local.tags
}

module "cosmos" {
  source = "../../_modules/cosmos"

  environment = merge(local.environment,
    {
      name = "apps"
    }
  )
  resource_group_name = data.azurerm_resource_group.wallet.name

  private_endpoint_subnet_id = data.azurerm_subnet.pep.id
  private_link_documents_id  = data.azurerm_private_dns_zone.documents.id

  action_group_ids = [
    module.monitoring.action_group_wallet.id,
  ]

  user_assigned_managed_identity_id = module.ids.psn_identity.id

  tags = local.tags
}

# Private endpoint to expose IO Cosmos DB (non-PSN) on PSN network for migration
resource "azurerm_private_endpoint" "io_cosmos_on_psn" {
  name                = "io-p-itn-wallet-cosno-pep-02"
  location            = local.environment.location
  resource_group_name = data.azurerm_resource_group.wallet.name
  subnet_id           = data.azurerm_subnet.pep.id

  private_service_connection {
    name                           = "io-p-itn-wallet-cosno-pep-02"
    private_connection_resource_id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-wallet-rg-01/providers/Microsoft.DocumentDB/databaseAccounts/io-p-itn-wallet-cosno-02"
    is_manual_connection           = true
    subresource_names              = ["Sql"]
    request_message                = "Connection for IO Wallet Cosmos DB migration to PSN"
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.documents.id]
  }

  tags = local.tags
}

module "function_apps" {
  source = "../../_modules/function_apps"

  environment = local.environment
  u_env_short = "u"

  resource_group_name = data.azurerm_resource_group.wallet.name
  subscription_id     = data.azurerm_subscription.current.subscription_id

  cidr_subnet_support_func  = "10.100.5.0/24"
  cidr_subnet_user_func     = "10.100.4.0/24"
  cidr_subnet_user_uat_func = "10.100.7.0/24"

  subnet_route_table_id = data.azurerm_route_table.spoke.id

  private_endpoint_subnet_id = data.azurerm_subnet.pep.id
  private_dns_zone_ids = {
    blob          = data.azurerm_private_dns_zone.blob.id
    file          = data.azurerm_private_dns_zone.file.id
    queue         = data.azurerm_private_dns_zone.queue.id
    table         = data.azurerm_private_dns_zone.table.id
    azurewebsites = data.azurerm_private_dns_zone.azurewebsites.id
  }
  virtual_network = {
    resource_group_name = data.azurerm_virtual_network.spoke.resource_group_name
    name                = data.azurerm_virtual_network.spoke.name
  }

  cosmos_db_endpoint                          = module.cosmos.apps.endpoint
  cosmos_database_name                        = module.cosmos.apps.database_name
  cosmos_database_name_uat                    = module.cosmos.apps.database_name_uat
  storage_account_cdn_name                    = azurerm_storage_account.cdn.name
  key_vault_id                                = module.key_vault_app.key_vault_wallet.id
  key_vault_wallet_id                         = module.key_vault_app.key_vault_wallet.id
  key_vault_wallet_name                       = module.key_vault_app.key_vault_wallet.name
  wallet_instance_creation_email_queue_name   = module.storage_accounts.wallet_instance_creation_email_queue_name_01.name
  wallet_instance_revocation_email_queue_name = module.storage_accounts.wallet_instance_revocation_email_queue_name_01.name
  front_door_profile_name                     = module.cdn.name
  front_door_endpoint_name                    = module.cdn.endpoint_hostname

  application_insights_connection_string = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.app_insights_connection_string.versionless_id})"

  action_group_wallet_id = module.monitoring.action_group_wallet.id

  user_func = local.user_func

  tags = local.tags
}

module "iam" {
  source = "../../_modules/iam"

  is_psn = true

  subscription_id = data.azurerm_subscription.current.subscription_id

  admin_ids = [
    data.azuread_group.wallet.object_id
  ]

  cdn_principal_id = module.cdn.principal_id

  cicd_principal_ids = {
    infra = {
      ci = data.azurerm_user_assigned_identity.infra_ci_id.principal_id
      cd = data.azurerm_user_assigned_identity.infra_cd_id.principal_id
    }
    app = {
      cd = data.azurerm_user_assigned_identity.app_cd_id.principal_id
    }
  }

  cosmos_db = {
    name                = module.cosmos.apps.name
    resource_group_name = module.cosmos.apps.resource_group_name
    database_name       = module.cosmos.apps.database_name
  }

  cosmos_db_uat = {
    name                = module.cosmos.apps.name
    resource_group_name = module.cosmos.apps.resource_group_name
    database_name       = module.cosmos.apps.database_name_uat
  }

  function_app = {
    user_func = {
      principal_id         = module.function_apps.function_app_user.principal_id
      staging_principal_id = module.function_apps.function_app_user.staging_principal_id
    }
    support_func = {
      principal_id         = module.function_apps.function_app_support.principal_id
      staging_principal_id = module.function_apps.function_app_support.staging_principal_id
    }
    user_func_uat = {
      principal_id         = module.function_apps.function_app_user_uat.principal_id
      staging_principal_id = module.function_apps.function_app_user_uat.staging_principal_id
    }
  }

  key_vault_app = {
    name                = module.key_vault_app.key_vault_wallet.name
    resource_group_name = module.key_vault_app.key_vault_wallet.resource_group_name
  }

  key_vault_certificates = {
    name                = module.key_vault_infra.key_vault_wallet.name
    resource_group_name = module.key_vault_infra.key_vault_wallet.resource_group_name
  }

  cdn_storage_account = {
    name                = azurerm_storage_account.cdn.name
    resource_group_name = azurerm_storage_account.cdn.resource_group_name
  }

  storage_account = {
    name                = azurerm_storage_account.cdn.name
    resource_group_name = azurerm_storage_account.cdn.resource_group_name
  }

  wallet_dns_zone_id = null
}
