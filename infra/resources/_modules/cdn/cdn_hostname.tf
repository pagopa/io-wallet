resource "azurerm_cdn_endpoint_custom_domain" "cdn" {
  name            = replace(local.cdn_hostname, ".", "-")
  cdn_endpoint_id = azurerm_cdn_endpoint.this.id
  host_name       = local.cdn_hostname

  cdn_managed_https {
    certificate_type = "Dedicated"
    protocol_type    = "ServerNameIndication"
    tls_version      = "TLS12"
  }
}
