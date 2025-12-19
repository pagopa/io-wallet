terraform {

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }

    azuread = {
      source  = "hashicorp/azuread"
      version = "<= 2.50.0"
    }

    azapi = {
      source  = "azure/azapi"
      version = "~> 2.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "iopitntfst001"
    container_name       = "terraform-state"
    key                  = "io-wallet.resources.prod.tfstate"
    use_azuread_auth     = true
  }
}

provider "azurerm" {
  features {}
  storage_use_azuread = true
}

provider "azapi" {
}

data "azurerm_resource_group" "wallet" {
  name = "${local.project}-wallet-rg-01"
}

module "ids" {
  source = "../_modules/identities"

  environment = merge(local.environment,
    {
      environment = local.environment.env_short
      name        = "psn"
    }
  )
  resource_group_name = data.azurerm_resource_group.wallet.name

  tags = local.tags
}

module "key_vaults" {
  source = "../_modules/key_vaults"

  environment = merge(local.environment,
    {
      environment = local.environment.env_short
      name        = "wallet"
    }
  )
  resource_group_name = data.azurerm_resource_group.wallet.name

  tenant_id = data.azurerm_client_config.current.tenant_id

  tags = local.tags
}

module "monitoring" {
  source = "../_modules/monitoring"

  project             = "${local.project}-wallet"
  resource_group_name = data.azurerm_resource_group.wallet.name
  display_name        = "wallet_ag_01"

  notification_email = data.azurerm_key_vault_secret.notification_email.value
  notification_slack = data.azurerm_key_vault_secret.notification_slack.value

  tags = local.tags
}

module "cosmos" {
  source = "../_modules/cosmos"

  environment = merge(local.environment,
    {
      domain          = ""
      environment     = local.environment.env_short
      name            = "wallet"
      instance_number = "02"
    }
  )
  secondary_location  = local.secondary_location
  resource_group_name = data.azurerm_resource_group.wallet.name

  private_endpoint_subnet_id = data.azurerm_subnet.pep.id
  private_link_documents_id  = data.azurerm_private_dns_zone.privatelink_documents.id

  action_group_ids = [
    module.monitoring.action_group_wallet.id,
    data.azurerm_monitor_action_group.io.id
  ]

  user_assigned_managed_identity_id = module.ids.psn_identity.id
  psn_service_principal_id          = data.azuread_service_principal.psn_app_id.client_id

  tags = local.tags
}

module "function_apps" {
  source = "../_modules/function_apps"

  environment = merge(local.environment,
    {
      environment = local.environment.env_short
      name        = "wallet"
    }
  )
  u_env_short          = local.u_env_short
  user_instance_number = "02"

  resource_group_name = data.azurerm_resource_group.wallet.name

  cidr_subnet_user_func     = "10.20.19.0/24"
  cidr_subnet_support_func  = "10.20.13.0/24"
  cidr_subnet_user_uat_func = "10.20.12.0/26"

  private_endpoint_subnet_id           = data.azurerm_subnet.pep.id
  private_dns_zone_resource_group_name = data.azurerm_resource_group.weu_common.name
  virtual_network = {
    resource_group_name = data.azurerm_virtual_network.vnet_common_itn.resource_group_name
    name                = data.azurerm_virtual_network.vnet_common_itn.name
  }

  cosmos_db_endpoint       = module.cosmos.apps.endpoint
  cosmos_database_name     = module.cosmos.apps.database_name
  cosmos_database_name_uat = module.cosmos.apps.database_name_uat
  storage_account_cdn_name = module.cdn.storage_account_cdn.name

  key_vault_id          = data.azurerm_key_vault.weu_common.id
  key_vault_wallet_id   = module.key_vaults.key_vault_wallet.id
  key_vault_wallet_name = module.key_vaults.key_vault_wallet.name

  wallet_instance_creation_email_queue_name   = module.storage_accounts.wallet_instance_creation_email_queue_name_01.name
  wallet_instance_revocation_email_queue_name = module.storage_accounts.wallet_instance_revocation_email_queue_name_01.name

  user_func = local.user_func

  front_door_profile_name  = module.cdn.cdn_profile_name
  front_door_endpoint_name = module.cdn.cdn_endpoint_name

  subscription_id = data.azurerm_subscription.current.subscription_id

  application_insights_connection_string = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.app_insights_connection_string.versionless_id})"

  nat_gateway_id = data.azurerm_nat_gateway.nat.id

  action_group_wallet_id = module.monitoring.action_group_wallet.id
  action_group_io_id     = data.azurerm_monitor_action_group.io.id

  tags = local.tags
}

module "cdn" {
  source = "../_modules/cdn"

  project         = local.project
  location        = local.environment.location
  location_legacy = local.location_legacy

  resource_group_name = data.azurerm_resource_group.wallet.name

  log_analytics_workspace_id = data.azurerm_log_analytics_workspace.law.id

  action_group_wallet_id = module.monitoring.action_group_wallet.id
  action_group_io_id     = data.azurerm_monitor_action_group.io.id

  key_vault_certificate_secret_id = data.azurerm_key_vault_certificate.wallet_certificate.versionless_secret_id

  tags = local.tags
}

module "iam" {
  source = "../_modules/iam"

  subscription_id = data.azurerm_subscription.current.subscription_id

  admin_ids = [
    data.azuread_group.eng_admins.object_id,
    data.azuread_group.wallet_admins.object_id,
  ]

  cdn_principal_id = module.cdn.cdn_principal_id

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
    name                = module.key_vaults.key_vault_wallet.name
    resource_group_name = module.key_vaults.key_vault_wallet.resource_group_name
  }

  key_vault_certificates = {
    name                = data.azurerm_key_vault.certificates.name
    resource_group_name = data.azurerm_key_vault.certificates.resource_group_name
  }

  cdn_storage_account = {
    name                = module.cdn.storage_account_cdn.name
    resource_group_name = module.cdn.storage_account_cdn.resource_group_name
  }

  storage_account = {
    name                = module.storage_accounts.wallet.name
    resource_group_name = module.storage_accounts.wallet.resource_group_name
  }

  wallet_dns_zone_id = data.azurerm_dns_zone.wallet_io_pagopa_it.id
  
  cdn_endpoint_id = module.cdn.cdn_endpoint_id
}

module "apim_itn" {
  source = "../_modules/apim"

  revision = "v1"

  project_legacy = local.project_legacy
  apim = {
    name                = local.apim.name
    resource_group_name = local.apim.resource_group_name
  }

  function_apps = {
    user_function = {
      function_hostname = module.function_apps.function_app_user.default_hostname
    }
    support_function = {
      function_hostname = module.function_apps.function_app_support.default_hostname
    }
  }

  key_vault_id        = data.azurerm_key_vault.weu_common.id
  key_vault_wallet_id = module.key_vaults.key_vault_wallet.id

  product_id = local.apim.products.io_web.product_id

  tags = local.tags
}

module "storage_accounts" {
  source = "../_modules/storage_accounts"

  environment = merge(local.environment,
    {
      environment = local.environment.env_short
      name        = "wallet"
    }
  )
  u_env_short         = local.u_env_short
  resource_group_name = data.azurerm_resource_group.wallet.name

  private_endpoint = {
    blob_private_dns_zone_id  = data.azurerm_private_dns_zone.privatelink_blob.id
    queue_private_dns_zone_id = data.azurerm_private_dns_zone.privatelink_queue.id
    subnet_pep_id             = data.azurerm_subnet.pep.id
  }

  action_group_id     = module.monitoring.action_group_wallet.id
  key_vault_wallet_id = module.key_vaults.key_vault_wallet.id

  tags = local.tags
}

module "dns" {
  source = "../_modules/dns"

  wallet_dns_zone_name                = local.wallet_dns_zone.name
  cdn_endpoint_id                     = module.cdn.cdn_endpoint_id
  wallet_dns_zone_resource_group_name = local.wallet_dns_zone.resource_group_name

  tags = local.tags
}
