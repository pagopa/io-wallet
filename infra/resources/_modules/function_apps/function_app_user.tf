module "function_app_user" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 4.0"

  environment = merge(var.environment, {
    app_name        = "user"
    env_short       = var.environment.environment
    instance_number = var.user_instance_number
  })

  resource_group_name = var.resource_group_name
  health_check_path   = var.health_check_path_user
  node_version        = 22

  subnet_id   = try(azurerm_subnet.func_user[0].id, null)
  subnet_cidr = var.subnet_route_table_id == null ? var.cidr_subnet_user_func : null

  subnet_pep_id                        = var.private_endpoint_subnet_id
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name
  private_dns_zone_ids                 = var.private_dns_zone_ids
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

  application_insights_connection_string   = var.application_insights_connection_string
  application_insights_sampling_percentage = 5

  action_group_ids = concat(
    [
      var.action_group_wallet_id
    ],
    var.action_group_io_id == null ? [] : [var.action_group_io_id]
  )

  use_case = "high_load"
  size     = "P3mv3"

  tags = var.tags
}

module "function_app_user_autoscaler_02" {
  source  = "pagopa-dx/azure-app-service-plan-autoscaler/azurerm"
  version = "~> 2.0"

  resource_group_name = var.resource_group_name

  location = var.environment.location

  app_service_plan_id = module.function_app_user.function_app.plan.id

  target_service = {
    function_apps = [
      {
        id = module.function_app_user.function_app.function_app.id
      }
    ]
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
