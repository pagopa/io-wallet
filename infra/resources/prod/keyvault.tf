module "keyvault" {
  source = "../_modules/keyvault"

  project             = local.project
  location            = local.location
  resource_group_name = module.resource_groups.resource_group_wallet.name

  tags = local.tags
}
