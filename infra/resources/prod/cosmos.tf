module "cosmos" {
  source = "../_modules/cosmos"

  project             = local.project
  project_legacy      = local.project_legacy
  location            = local.location
  secondary_location  = local.secondary_location
  resource_group_name = module.resource_groups.resource_group_wallet.name

  private_endpoint_subnet_id = module.networking.subnet_pendpoints.id

  tags = local.tags
}
