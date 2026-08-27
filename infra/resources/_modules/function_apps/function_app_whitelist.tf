module "function_app_whitelist" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 4.0"

  environment = merge(var.environment, {
    app_name        = "whitelist"
    env_short       = var.environment.environment
    instance_number = "01"
  })

  resource_group_name = var.resource_group_name
  health_check_path   = var.health_check_path_whitelist
  node_version        = 22

  subnet_id   = try(azurerm_subnet.func_whitelist[0].id, null)
  subnet_cidr = var.subnet_route_table_id == null ? var.cidr_subnet_whitelist_func : null

  subnet_pep_id                        = var.private_endpoint_subnet_id
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name
  private_dns_zone_ids                 = var.private_dns_zone_ids
  virtual_network = {
    name                = var.virtual_network.name
    resource_group_name = var.virtual_network.resource_group_name
  }

  app_settings      = local.function_app_whitelist.app_settings
  slot_app_settings = local.function_app_whitelist.app_settings

  application_insights_connection_string   = var.application_insights_connection_string
  application_insights_sampling_percentage = 5

  use_case = "default"
  size     = "P0v3"

  tags = var.tags
}
