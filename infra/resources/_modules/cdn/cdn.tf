resource "azurerm_cdn_profile" "this" {
  name                = "${var.project}-wallet-cdnp-01"
  resource_group_name = var.resource_group_name
  location            = "westeurope"
  sku                 = "Standard_Microsoft"

  tags = var.tags
}

# Workaround to export the principal id of the CDN profile
# as azurerm_cdn_profile does not support it directly
data "azapi_resource" "cdn_profile" {
  type        = "Microsoft.Cdn/profiles@2025-04-15"
  resource_id = azurerm_cdn_profile.this.id

  response_export_values = ["identity.principalId"]

  depends_on = [azurerm_cdn_profile.this]
}

resource "azurerm_cdn_endpoint" "this" {
  name                = "${var.project}-wallet-cdne-01"
  resource_group_name = var.resource_group_name
  location            = azurerm_cdn_profile.this.location

  profile_name     = azurerm_cdn_profile.this.name
  is_https_allowed = true
  is_http_allowed  = true

  querystring_caching_behaviour = "BypassCaching"

  origin_host_header = azurerm_storage_account.this.primary_blob_host

  origin {
    name      = "primary"
    host_name = azurerm_storage_account.this.primary_blob_host
  }

  delivery_rule {
    name  = "WellKnownRewrite"
    order = 1

    request_uri_condition {
      operator = "BeginsWith"
      match_values = [
        "https://${local.cdn_hostname}/.well-known/"
      ]
    }

    url_rewrite_action {
      source_pattern          = "/.well-known/"
      destination             = "/well-known/"
      preserve_unmatched_path = true
    }
  }

  delivery_rule {
    name  = "EnforceHTTPS"
    order = 2

    request_scheme_condition {
      operator     = "Equal"
      match_values = ["HTTP"]
    }

    # rewrite HTTP to HTTPS
    url_redirect_action {
      redirect_type = "Found"
      protocol      = "Https"
      hostname      = null
      path          = null
      fragment      = null
      query_string  = null
    }
  }

  tags = var.tags
}

resource "azurerm_monitor_diagnostic_setting" "cdn_profile" {
  name                       = "${azurerm_cdn_profile.this.name}-diagnostic-settings"
  target_resource_id         = azurerm_cdn_profile.this.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category_group = "allLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
