
module "function_app_support" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 4.0"

  environment = merge(var.environment, {
    app_name  = var.environment.domain == null ? "support" : "supp"
    env_short = var.environment.environment
  })

  resource_group_name = var.resource_group_name
  health_check_path   = "/api/v1/wallet/health"
  node_version        = 22

  subnet_id   = try(azurerm_subnet.func_support[0].id, null)
  subnet_cidr = var.subnet_route_table_id == null ? var.cidr_subnet_support_func : null

  subnet_pep_id                        = var.private_endpoint_subnet_id
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name
  private_dns_zone_ids                 = var.private_dns_zone_ids
  virtual_network = {
    name                = var.virtual_network.name
    resource_group_name = var.virtual_network.resource_group_name
  }

  app_settings      = local.function_app_support.app_settings
  slot_app_settings = local.function_app_support.app_settings

  action_group_ids = [
    var.action_group_wallet_id
  ]

  use_case = "default"

  tags = var.tags
}

module "function_app_support_autoscaler" {
  source  = "pagopa-dx/azure-app-service-plan-autoscaler/azurerm"
  version = "~> 2.0"

  resource_group_name = var.resource_group_name

  location = var.environment.location

  app_service_plan_id = module.function_app_support.function_app.plan.id

  target_service = {
    function_apps = [
      {
        id = module.function_app_support.function_app.function_app.id
      }
    ]
  }

  scheduler = {
    maximum = 30
    normal_load = {
      default = 1
      minimum = 1
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
