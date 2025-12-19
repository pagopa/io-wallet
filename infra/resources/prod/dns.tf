resource "azurerm_dns_a_record" "api_wallet_io_pagopa_it" {
  name                = "api.wallet"
  records             = ["72.146.49.243"] # AppGw (PSN) public ip
  resource_group_name = data.azurerm_dns_zone.io_pagopa_it.resource_group_name
  ttl                 = 60
  zone_name           = data.azurerm_dns_zone.io_pagopa_it.name

  tags = local.tags
}

resource "azurerm_dns_a_record" "api_wallet_io_pagopa_it_child" {
  name                = "api"
  records             = ["72.146.49.243"] # AppGw (PSN) public ip
  resource_group_name = data.azurerm_dns_zone.wallet_io_pagopa_it.resource_group_name
  ttl                 = 60
  zone_name           = data.azurerm_dns_zone.wallet_io_pagopa_it.name

  tags = local.tags
}

resource "azurerm_private_dns_zone" "internal_wallet_io_pagopa_it" {
  name                = "internal.wallet.io.pagopa.it"
  resource_group_name = data.azurerm_resource_group.wallet.name

  tags = local.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "vnet_common_internal_wallet_io_pagopa_it" {
  name                  = data.azurerm_virtual_network.vnet_common_itn.name
  resource_group_name   = azurerm_private_dns_zone.internal_wallet_io_pagopa_it.resource_group_name
  virtual_network_id    = data.azurerm_virtual_network.vnet_common_itn.id
  private_dns_zone_name = azurerm_private_dns_zone.internal_wallet_io_pagopa_it.name
}

resource "azurerm_private_dns_a_record" "api_internal_wallet_io_pagopa_it" {
  name                = "api"
  records             = ["10.20.2.119"] # AppGw (PSN) private ip
  resource_group_name = data.azurerm_resource_group.wallet.name
  ttl                 = 10
  zone_name           = azurerm_private_dns_zone.internal_wallet_io_pagopa_it.name
}
