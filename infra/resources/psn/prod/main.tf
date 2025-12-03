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
