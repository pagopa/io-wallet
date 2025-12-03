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

module "key_vault_cdn" {
  source = "../../_modules/key_vaults"

  environment = merge(local.environment,
    {
      name = "cdn"
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

  action_group_id = module.monitoring.action_group_wallet.id

  user_assigned_managed_identity_id = module.ids.psn_identity.id
  customer_managed_key_url          = local.hsm_key_url

  tags = local.tags
}

# TODO: replace with IAM submodules when all resources will be created
module "team_roles" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  principal_id    = data.azuread_group.wallet.object_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  key_vault = [
    {
      name                = module.key_vault_app.key_vault_wallet.name
      resource_group_name = module.key_vault_app.key_vault_wallet.resource_group_name
      description         = "Allow Wallet team to manage secrets"
      roles = {
        secrets = "owner"
      }
    },
    {
      name                = module.key_vault_cdn.key_vault_wallet.name
      resource_group_name = module.key_vault_cdn.key_vault_wallet.resource_group_name
      description         = "Allow Wallet team to manage secrets and certificates"
      roles = {
        secrets      = "owner"
        certificates = "owner"
      }
    }
  ]

  storage_blob = [
    {
      storage_account_name = module.storage_accounts.wallet.name
      resource_group_name  = module.storage_accounts.wallet.resource_group_name
      role                 = "owner"
      description          = "Allow Wallet team to manage blobs in the storage account"
    }
  ]

  storage_queue = [
    {
      storage_account_name = module.storage_accounts.wallet.name
      resource_group_name  = module.storage_accounts.wallet.resource_group_name
      role                 = "writer"
      description          = "Allow Wallet team to send messages to queues"
    },
    {
      storage_account_name = module.storage_accounts.wallet.name
      resource_group_name  = module.storage_accounts.wallet.resource_group_name
      role                 = "owner"
      description          = "Allow Wallet team to manage queues"
    }
  ]
}
