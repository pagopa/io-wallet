resource "azurerm_dns_cname_record" "this" {
  name                = "wallet"
  zone_name           = local.cdn_dns_zone_name
  resource_group_name = local.dns_zone_name_resource_group_name
  ttl                 = 3600
  record              = azurerm_cdn_endpoint.this.fqdn

  tags = var.tags
}
