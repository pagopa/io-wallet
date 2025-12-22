locals {
  psn_appgw_pep = {
    name = provider::dx::resource_name(merge(
      local.environment,
      {
        name          = "psn-agw"
        resource_type = "private_endpoint"
      }
    ))
  }
}

resource "azurerm_private_endpoint" "psn_application_gateway" {
  name = local.psn_appgw_pep.name

  location            = local.environment.location
  resource_group_name = data.azurerm_resource_group.common_itn.name
  subnet_id           = data.azurerm_subnet.pep.id

  private_service_connection {
    name                           = local.psn_appgw_pep.name
    is_manual_connection           = true
    private_connection_resource_id = "/subscriptions/f3c27dbc-5c86-4c14-b43f-9faed77e5e19/resourceGroups/pagopa-rg-hub-network-italynorth/providers/Microsoft.Network/applicationGateways/pagopa-app-gw-italynorth"
    subresource_names              = ["appGwPrivateFrontendIp"]
    request_message                = "Allow connection from IO to PSN Application Gateway (Hub)"
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.internal_wallet_io_pagopa_it.id]
  }

  tags = local.tags
}

resource "azurerm_private_dns_a_record" "psn_application_gateway" {
  name                = "api"
  zone_name           = data.azurerm_private_dns_zone.internal_wallet_io_pagopa_it.name
  resource_group_name = data.azurerm_private_dns_zone.internal_wallet_io_pagopa_it.resource_group_name
  records             = [azurerm_private_endpoint.psn_application_gateway.private_service_connection[0].private_ip_address]
  ttl                 = 3600

  tags = local.tags
}
