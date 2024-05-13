module "networking" {
  source = "../_modules/networking"

  project        = local.project
  project_legacy = local.project_legacy

  # inferred from vnet-common with cidr 10.20.0.0/16
  cidr_subnet_wallet = ["10.20.253.0/26"]

  tags = local.tags
}
