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

# TODO: replace with IAM submodules when all resources will be created
module "team_roles" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 0.0"

  principal_id = data.azuread_group.wallet.object_id

  key_vault = [
    {
      name                = module.key_vault_app.key_vault_wallet.name
      resource_group_name = module.key_vault_app.key_vault_wallet.resource_group_name
      roles = {
        secrets = "owner"
      }
    },
    {
      name                = module.key_vault_cdn.key_vault_wallet.name
      resource_group_name = module.key_vault_cdn.key_vault_wallet.resource_group_name
      roles = {
        secrets      = "owner"
        certificates = "owner"
      }
    }
  ]
}
