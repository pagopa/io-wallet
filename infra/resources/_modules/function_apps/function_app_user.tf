module "function_app_user" {
  # source = "../../../../../../devex/dx/infra/modules/azure_function_app"
  source = "github.com/pagopa/dx//infra/modules/azure_function_app?ref=main"

  environment = {
    prefix          = var.prefix
    env_short       = var.env_short
    location        = "italynorth"
    domain          = "wallet"
    app_name        = "user"
    instance_number = "01"
  }

  resource_group_name = var.resource_group_name
  health_check_path   = "/api/v1/wallet/info"
  node_version        = 20

  subnet_cidr                          = "10.0.2.0/24"
  subnet_pep_id                        = var.private_endpoint_subnet_id
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name
  virtual_network = {
    name                = var.virtual_network.name
    resource_group_name = var.virtual_network.resource_group_name
  }

  app_settings      = local.function_app_wallet.app_settings
  slot_app_settings = local.function_app_wallet.app_settings

  tier = "test"

  tags = var.tags
}
