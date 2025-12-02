module "ids" {
  source = "../../_modules/identities"

  environment = merge(local.environment, {
    name = "cmk"
  })
  resource_group_name = data.azurerm_resource_group.wallet.name

  tags = local.tags
}
