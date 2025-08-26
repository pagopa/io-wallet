module "function_app_user_uat" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 0.0"

  environment = {
    prefix          = var.prefix
    env_short       = var.u_env_short
    location        = "italynorth"
    domain          = "wallet"
    app_name        = "user"
    instance_number = "01"
  }

  resource_group_name = var.resource_group_name
  health_check_path   = "/api/v1/wallet/health"
  node_version        = 20

  subnet_cidr                          = var.cidr_subnet_user_uat_func
  subnet_pep_id                        = var.private_endpoint_subnet_id
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name
  virtual_network = {
    name                = var.virtual_network.name
    resource_group_name = var.virtual_network.resource_group_name
  }

  app_settings      = local.function_app_user_uat.app_settings
  slot_app_settings = local.function_app_user_uat.app_settings

  action_group_id = var.action_group_wallet_id

  tier = "l"

  tags = var.tags
}
