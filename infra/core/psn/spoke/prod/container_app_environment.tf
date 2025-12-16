locals {
  cae_name = provider::dx::resource_name(merge(local.environment, {
    name          = "github-runner"
    resource_type = "container_app_environment",
  }))

  cae_infra_rg_name = "ME_${local.cae_name}_${azurerm_resource_group.gh_runner.name}_${local.environment.location}"
}

resource "azurerm_container_app_environment" "cae" {
  name                = local.cae_name
  location            = local.environment.location
  resource_group_name = azurerm_resource_group.gh_runner.name

  identity {
    type         = "SystemAssigned"
    identity_ids = []
  }

  workload_profile {
    maximum_count         = 0
    minimum_count         = 0
    name                  = "Consumption"
    workload_profile_type = "Consumption"
  }

  log_analytics_workspace_id = azurerm_log_analytics_workspace.cae_log_analytics.id

  infrastructure_resource_group_name = local.cae_infra_rg_name

  infrastructure_subnet_id       = azurerm_subnet.cae_snet.id
  logs_destination               = "log-analytics"
  public_network_access          = "Disabled"
  internal_load_balancer_enabled = true

  tags = local.tags
}
