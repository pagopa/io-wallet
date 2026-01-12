data "azurerm_key_vault_secret" "wallet_email" {
  name         = "wallet-tech-team-email"
  key_vault_id = module.key_vault_app.key_vault_wallet.id
}

resource "dx_available_subnet_cidr" "apim_apps" {
  prefix_length      = 25
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

  service_endpoints = [
    "Microsoft.Storage",
    "Microsoft.Sql",
    "Microsoft.KeyVault",
    "Microsoft.Web",
    "Microsoft.AzureActiveDirectory",
    "Microsoft.EventHub",
    "Microsoft.ServiceBus"
  ]
}

resource "azurerm_subnet_route_table_association" "apim_apps" {
  route_table_id = data.azurerm_route_table.spoke.id
  subnet_id      = azurerm_subnet.apim.id
}

resource "azurerm_private_dns_a_record" "apim_azure_api_net" {
  provider = azurerm.hub

  name                = module.apim.name
  zone_name           = "azure-api.net"
  resource_group_name = local.hub.resource_group_name
  ttl                 = 3600
  records             = module.apim.private_ip_addresses
  tags                = local.tags

  depends_on = [module.apim]
}

resource "azurerm_private_dns_a_record" "apim_management_azure_api_net" {
  provider = azurerm.hub

  name                = module.apim.name
  zone_name           = "management.azure-api.net"
  resource_group_name = local.hub.resource_group_name
  ttl                 = 3600
  records             = module.apim.private_ip_addresses
  tags                = local.tags

  depends_on = [module.apim]
}

resource "azurerm_private_dns_a_record" "apim_scm_azure_api_net" {
  provider = azurerm.hub

  name                = module.apim.name
  zone_name           = "scm.azure-api.net"
  resource_group_name = local.hub.resource_group_name
  ttl                 = 3600
  records             = module.apim.private_ip_addresses
  tags                = local.tags

  depends_on = [module.apim]
}

module "apim" {
  source  = "pagopa-dx/azure-api-management/azurerm"
  version = "~> 2.1"

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
  enable_public_network_access  = true

  hostname_configuration = {
    proxy = [
      {
        default_ssl_binding = false
        host_name           = "iw-p-itn-apps-apim-01.azure-api.net"
        key_vault_id        = null
      },
      {
        default_ssl_binding = true
        host_name           = "apim.internal.wallet.io.pagopa.it"
        key_vault_id = replace(
          data.azurerm_key_vault_certificate.apim.secret_id,
          "/${data.azurerm_key_vault_certificate.apim.version}",
          ""
        )
      }
    ]
    management       = null
    portal           = null
    developer_portal = null
  }

  # Autoscale
  autoscale = {
    enabled                       = true
    default_instances             = 2
    minimum_instances             = 2
    maximum_instances             = 2
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

resource "azurerm_private_dns_a_record" "apim_internal_wallet_io_pagopa_it" {
  provider = azurerm.hub

  name                = "apim"
  zone_name           = "internal.wallet.io.pagopa.it"
  records             = [module.apim.private_ip_addresses[0]]
  resource_group_name = local.hub.resource_group_name
  ttl                 = 3600
}
