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

resource "azurerm_dns_txt_record" "wallet_io_pagopa_it" {
  name                = "_dnsauth.wallet"
  zone_name           = data.azurerm_dns_zone.io_pagopa_it.name
  resource_group_name = data.azurerm_dns_zone.io_pagopa_it.resource_group_name
  ttl                 = 3600

  record {
    value = "_nf8vvdk9f1qleomxqgtnyj3fws7aql7"
  }

  tags = local.tags
}

resource "azurerm_dns_cname_record" "wallet_io_pagopa_it" {
  name                = "wallet"
  resource_group_name = data.azurerm_dns_zone.io_pagopa_it.resource_group_name

  zone_name = data.azurerm_dns_zone.io_pagopa_it.name
  record    = "iw-p-itn-cdn-fde-01-aza7ezdzg9buc8gm.a02.azurefd.net"
  ttl       = 60

  tags = local.tags
}
