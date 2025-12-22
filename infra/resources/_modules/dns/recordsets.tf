resource "azurerm_dns_a_record" "this" {
  name                = "@"
  zone_name           = var.wallet_dns_zone_name
  resource_group_name = var.wallet_dns_zone_resource_group_name
  ttl                 = 300
  records             = ["72.146.49.243"]
  tags                = var.tags
}

# TXT for Maven verification
resource "azurerm_dns_txt_record" "wallet_io_pagopa_it" {
  name                = "@"
  zone_name           = var.wallet_dns_zone_name
  resource_group_name = var.wallet_dns_zone_resource_group_name
  ttl                 = 3600
  record {
    value = "qidvirtenu"
  }
  tags = var.tags
}

# TXT for cbor Maven namespace verification
resource "azurerm_dns_txt_record" "cbor_wallet_io_pagopa_it" {
  name                = "cbor"
  zone_name           = var.wallet_dns_zone_name
  resource_group_name = var.wallet_dns_zone_resource_group_name
  ttl                 = 3600
  record {
    value = "mku7fqer6d"
  }
  tags = var.tags
}

# TXT for proximity Maven namespace verification
resource "azurerm_dns_txt_record" "proximity_wallet_io_pagopa_it" {
  name                = "proximity"
  zone_name           = var.wallet_dns_zone_name
  resource_group_name = var.wallet_dns_zone_resource_group_name
  ttl                 = 3600
  record {
    value = "sh4ibgibuy"
  }
  tags = var.tags
}
