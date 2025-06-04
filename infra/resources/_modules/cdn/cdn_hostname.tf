resource "azurerm_cdn_endpoint_custom_domain" "cdn" {
  name            = replace(local.cdn_hostname, ".", "-")
  cdn_endpoint_id = azurerm_cdn_endpoint.this.id
  host_name       = local.cdn_hostname

  user_managed_https {
    key_vault_secret_id = var.key_vault_certificate_secret_id
    tls_version         = "TLS12"
  }
}
