
module "function_app_support" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 3.0"

  environment = {
    prefix          = var.prefix
    env_short       = var.env_short
    location        = "italynorth"
    domain          = "wallet"
    app_name        = "supp"
    instance_number = "01"
  }

  resource_group_name = var.resource_group_name
  health_check_path   = "/api/v1/wallet/health"
  node_version        = 24

  subnet_cidr                          = var.cidr_subnet_support_func
  subnet_pep_id                        = var.private_endpoint_subnet_id
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name
  virtual_network = {
    name                = var.virtual_network.name
    resource_group_name = var.virtual_network.resource_group_name
  }

  app_settings      = local.function_app_support.app_settings
  slot_app_settings = local.function_app_support.app_settings

  action_group_ids = [
    var.action_group_wallet_id
  ]

  tier = "l"

  tags = var.tags
}

module "function_app_support_autoscaler" {
  source  = "pagopa-dx/azure-app-service-plan-autoscaler/azurerm"
  version = "~> 0.0"

  resource_group_name = var.resource_group_name

  target_service = {
    function_app_name = module.function_app_support.function_app.function_app.name
  }

  scheduler = {
    maximum = 30
    normal_load = {
      default = 5
      minimum = 3
    }
  }

  scale_metrics = {
    cpu = {
      upper_threshold = 50
      increase_by     = 2
    }
  }

  tags = var.tags
}
