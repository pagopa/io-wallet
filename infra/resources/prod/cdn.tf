module "cdn" {
  source = "../_modules/cdn"

  project             = local.project
  location            = local.location
  resource_group_name = module.resource_groups.resource_group_wallet.name

  dns_zone = "io.pagopa.it"

  keyvault_vault_name = module.keyvault.name

  tags = local.tags
}
