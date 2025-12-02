module "ids" {
  source = "../../_modules/identities"

  environment = merge(local.environment, {
    name = "data-cmk"
  })
  resource_group_name = data.azurerm_resource_group.wallet.name

  tags = local.tags
}
