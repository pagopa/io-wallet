resource "azurerm_cdn_profile" "this" {
  name                = "${var.project}-wallet-cdnp-01"
  resource_group_name = var.resource_group_name
  location            = "westeurope"
  sku                 = "Standard_Microsoft"

  tags = var.tags
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

  # https://learn.microsoft.com/en-us/azure/cdn/cdn-standard-rules-engine-actions
  global_delivery_rule {
    modify_request_header_action {
      action = "Overwrite"
      name   = "Cache-Control"
      value  = "no-store"
    }
    modify_response_header_action {
      action = "Overwrite"
      name   = "Cache-Control"
      value  = "no-store"
    }
  }

  delivery_rule {
    name  = "EnforceHTTPS"
    order = 1

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

  metric {
    category = "AllMetrics"
  }
}
