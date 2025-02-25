locals {
  dns_name          = "wallet"
  cdn_dns_zone_name = "io.pagopa.it"
  cdn_hostname      = "${local.dns_name}.${local.cdn_dns_zone_name}"
}
