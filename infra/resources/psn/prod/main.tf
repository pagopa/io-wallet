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

resource "azurerm_key_vault_certificate" "psn_internal_io_pagopa_it" {
  name         = "psn-internal-io-pagopa-it"
  key_vault_id = module.key_vault_infra.key_vault_wallet.id

  certificate_policy {
    issuer_parameters {
      name = "Self"
    }

    key_properties {
      exportable = true
      key_size   = 2048
      key_type   = "RSA"
      reuse_key  = false
    }

    x509_certificate_properties {
      key_usage = [
        "digitalSignature",
        "keyEncipherment",
      ]
      subject            = "CN=psn.internal.io.pagopa.it"
      validity_in_months = 12
    }

    lifetime_action {
      action {
        action_type = "AutoRenew"
      }
      trigger {
        days_before_expiry = 30
      }
    }

    secret_properties {
      content_type = "application/x-pkcs12"
    }
  }
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
  storage_account_cdn_name                    = "" # TODO: fill when resource will be created
  key_vault_id                                = module.key_vault_app.key_vault_wallet.id
  key_vault_wallet_id                         = module.key_vault_app.key_vault_wallet.id
  key_vault_wallet_name                       = module.key_vault_app.key_vault_wallet.name
  wallet_instance_creation_email_queue_name   = module.storage_accounts.wallet_instance_creation_email_queue_name_01.name
  wallet_instance_revocation_email_queue_name = module.storage_accounts.wallet_instance_revocation_email_queue_name_01.name
  front_door_profile_name                     = "" # TODO: fill when resource will be created
  front_door_endpoint_name                    = "" # TODO: fill when resource will be created

  application_insights_connection_string = data.azurerm_application_insights.core.connection_string

  action_group_wallet_id = module.monitoring.action_group_wallet.id

  user_func = {
    app_settings = []
  }

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
      name                = module.key_vault_infra.key_vault_wallet.name
      resource_group_name = module.key_vault_infra.key_vault_wallet.resource_group_name
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
    },
    {
      storage_account_name = module.function_apps.function_app_user.storage_account
      resource_group_name  = module.function_apps.function_app_user.resource_group_name
      role                 = "reader"
      description          = "Allow Wallet team to read blobs in the function app storage account"
    },
    {
      storage_account_name = module.function_apps.function_app_support.storage_account
      resource_group_name  = module.function_apps.function_app_support.resource_group_name
      role                 = "reader"
      description          = "Allow Wallet team to read blobs in the function app storage account"
    },
    {
      storage_account_name = module.function_apps.function_app_user_uat.storage_account
      resource_group_name  = module.function_apps.function_app_user_uat.resource_group_name
      role                 = "reader"
      description          = "Allow Wallet team to read blobs in the UAT function app storage account"
    },
    {
      storage_account_name = azurerm_storage_account.cdn.name
      resource_group_name  = azurerm_storage_account.cdn.resource_group_name
      role                 = "owner"
      description          = "Allow Wallet team to manage blobs in the CDN storage account"
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

  cosmos = [
    {
      account_name        = module.cosmos.apps.name
      resource_group_name = module.cosmos.apps.resource_group_name
      description         = "Allow Wallet team to manage databases and containers in the Cosmos DB account"
      role                = "writer"
    }
  ]
}

module "appgw_roles" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  principal_id    = data.azurerm_user_assigned_identity.appgateway.principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  key_vault = [
    {
      name                = module.key_vault_infra.key_vault_wallet.name
      resource_group_name = module.key_vault_infra.key_vault_wallet.resource_group_name
      description         = "Allow AppGw to access secrets"
      roles = {
        secrets = "reader"
      }
    }
  ]
}
