module "resource_groups" {
  source = "../_modules/resource_groups"

  location = local.location
  project  = local.project

  tags = local.tags
}
