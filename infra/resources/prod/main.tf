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

module "apim_itn" {
  source = "../_modules/apim"

  revision = "v1"

  project_legacy = local.project_legacy
  apim = {
    name                = data.azurerm_api_management.apim.name
    resource_group_name = data.azurerm_api_management.apim.resource_group_name
    id                  = data.azurerm_api_management.apim.id
  }

  product_id = local.apim.products.io_web.product_id

  tags = local.tags
}

module "dns" {
  source = "../_modules/dns"

  wallet_dns_zone_name                = local.wallet_dns_zone.name
  wallet_dns_zone_resource_group_name = local.wallet_dns_zone.resource_group_name

  tags = local.tags
}
