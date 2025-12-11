data "azurerm_key_vault_secret" "wallet_email" {
  name         = "wallet-tech-team-email"
  key_vault_id = module.key_vault_app.key_vault_wallet.id
}

resource "dx_available_subnet_cidr" "apim_apps" {
  prefix_length      = 24
  virtual_network_id = data.azurerm_virtual_network.spoke.id
}

resource "azurerm_subnet" "apim" {
  name = provider::dx::resource_name(merge(local.environment,
    {
      name          = "apps"
      resource_type = "apim_subnet"
    }
  ))

  resource_group_name  = data.azurerm_virtual_network.spoke.resource_group_name
  virtual_network_name = data.azurerm_virtual_network.spoke.name

  address_prefixes = [dx_available_subnet_cidr.apim_apps.cidr_block]
}

resource "azurerm_subnet_route_table_association" "apim_apps" {
  route_table_id = data.azurerm_route_table.spoke.id
  subnet_id      = azurerm_subnet.apim.id
}

module "apim" {
  # source  = "pagopa-dx/azure-api-management/azurerm"
  # version = "~> 2.0"

  source = "github.com/pagopa/dx//infra/modules/azure_api_management?ref=apim-multiple-sub-dns"

  environment = merge(local.environment,
    {
      app_name  = "apps"
      env_short = local.environment.environment
    }
  )

  resource_group_name = data.azurerm_resource_group.wallet.name

  publisher_email = data.azurerm_key_vault_secret.wallet_email.value
  publisher_name  = "Wallet Tech Team"

  application_insights = {
    enabled             = true
    id                  = data.azurerm_application_insights.core.id
    connection_string   = data.azurerm_application_insights.core.connection_string
    sampling_percentage = 100 # TODO: adjust after tests
    verbosity           = "information"
  }
  action_group_id = module.monitoring.action_group_wallet.id

  use_case = "high_load"

  private_dns_zone_ids = {
    azure_api_net            = data.azurerm_private_dns_zone.azure_api_net.id
    management_azure_api_net = data.azurerm_private_dns_zone.management_azure_api_net.id
    scm_azure_api_net        = data.azurerm_private_dns_zone.scm_azure_api_net.id
  }
  virtual_network = {
    name                = data.azurerm_virtual_network.spoke.name
    resource_group_name = data.azurerm_virtual_network.spoke.resource_group_name
  }
  subnet_id                     = azurerm_subnet.apim.id
  virtual_network_type_internal = true
  enable_public_network_access  = true # Change after first apply

  # Autoscale
  autoscale = {
    enabled                       = true
    default_instances             = 2
    minimum_instances             = 2
    maximum_instances             = 6
    scale_out_capacity_percentage = 60
    scale_out_time_window         = "PT10M"
    scale_out_value               = "2"
    scale_out_cooldown            = "PT45M"
    scale_in_capacity_percentage  = 30

    scale_in_time_window = "PT30M"
    scale_in_value       = "2"
    scale_in_cooldown    = "PT30M"
  }

  tags = local.tags
}
