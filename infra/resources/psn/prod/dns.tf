resource "azurerm_private_dns_a_record" "api_internal_wallet_io_pagopa_it" {
  name                = "api"
  zone_name           = "internal.wallet.io.pagopa.it"
  records             = [data.azurerm_application_gateway.hub.frontend_ip_configuration[1].private_ip_address]
  resource_group_name = local.hub.resource_group_name
  ttl                 = 3600
}
