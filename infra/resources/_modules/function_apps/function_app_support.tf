
module "function_app_support" {
  source = "github.com/pagopa/dx//infra/modules/azure_function_app?ref=main"

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
  node_version        = 20

  subnet_cidr                          = var.cidr_subnet_support_func
  subnet_pep_id                        = var.private_endpoint_subnet_id
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name
  virtual_network = {
    name                = var.virtual_network.name
    resource_group_name = var.virtual_network.resource_group_name
  }

  app_settings      = local.function_app_support.app_settings
  slot_app_settings = local.function_app_support.app_settings

  tier = "premium"

  tags = var.tags
}

module "function_app_support_autoscaler" {
  source = "github.com/pagopa/dx//infra/modules/azure_app_service_plan_autoscaler?ref=main"

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
