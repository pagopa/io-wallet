locals {
  dns_zone_name_resource_group_name = "io-p-rg-external"

  dns_name                 = "wallet"
  cdn_dns_zone_name        = "io.pagopa.it"
  wallet_cdn_dns_zone_name = "wallet.io.pagopa.it"
  cdn_hostname             = "${local.dns_name}.${local.cdn_dns_zone_name}"
}
