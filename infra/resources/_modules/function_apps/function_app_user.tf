module "function_app_user_02" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 0.0"

  environment = {
    prefix          = var.prefix
    env_short       = var.env_short
    location        = "italynorth"
    domain          = "wallet"
    app_name        = "user"
    instance_number = "02"
  }

  resource_group_name = var.resource_group_name
  health_check_path   = "/api/v1/wallet/health"
  node_version        = 20

  subnet_cidr                          = var.cidr_subnet_user_func_02
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

  action_group_id = var.action_group_wallet_id

  tier = "xxl"

  tags = var.tags
}

module "function_app_user_autoscaler_02" {
  source  = "pagopa-dx/azure-app-service-plan-autoscaler/azurerm"
  version = "~> 0.0"

  resource_group_name = var.resource_group_name

  target_service = {
    function_app_name = module.function_app_user_02.function_app.function_app.name
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
      upper_threshold   = 50
      increase_by       = 2
      cooldown_increase = 1

      cooldown_decrease = 2
    }
    requests = {
      upper_threshold           = 5000
      increase_by               = 2
      statistic_increase        = "Max"
      time_aggregation_increase = "Maximum"

      decrease_by       = 1
      lower_threshold   = 1000
      cooldown_decrease = 1
    }
  }

  tags = var.tags
}
