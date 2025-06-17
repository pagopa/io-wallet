module "function_app_user_pre_prod" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 0.0"

  environment = {
    prefix          = var.prefix
    env_short       = var.env_short
    location        = "italynorth"
    domain          = "wallet"
    app_name        = "user-pre-prod"
    instance_number = "01"
  }

  resource_group_name = var.resource_group_name
  health_check_path   = "/api/v1/wallet/health"
  node_version        = 20

  subnet_cidr                          = var.cidr_subnet_user_pre_prod_func
  subnet_pep_id                        = var.private_endpoint_subnet_id
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name
  virtual_network = {
    name                = var.virtual_network.name
    resource_group_name = var.virtual_network.resource_group_name
  }

  app_settings      = local.function_app_user.app_settings
  slot_app_settings = local.function_app_user.slot_app_settings
  sticky_app_setting_names = [
    for to_disable in local.function_app_user_slot_disabled :
    format("AzureWebJobs.%s.Disabled", to_disable)
  ]

  tier = "l"

  tags = var.tags
}
