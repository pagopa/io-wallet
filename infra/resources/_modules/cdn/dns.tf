resource "azurerm_dns_a_record" "this" {
  name                = "@"
  zone_name           = local.wallet_cdn_dns_zone_name
  resource_group_name = local.dns_zone_name_resource_group_name
  ttl                 = 3600
  target_resource_id  = azurerm_cdn_endpoint.this.id
  tags                = var.tags
}

# TXT for Maven verification
resource "azurerm_dns_txt_record" "wallet_io_pagopa_it" {
  name                = "@"
  zone_name           = local.wallet_cdn_dns_zone_name
  resource_group_name = local.dns_zone_name_resource_group_name
  ttl                 = 3600
  record {
    value = "qidvirtenu"
  }
  tags = var.tags
}