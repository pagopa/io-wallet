locals {
  api_prefix  = "api"
  apim_prefix = "apim"
  cdn_prefix  = "cdn"

  appgw = {
    name = "pagopa-app-gw-italynorth"

    apim_backend_pool_name = "${local.apim_prefix}-backend-pool"
    cdn_backend_pool_name  = "${local.cdn_prefix}-backend-pool"

    frontend_port_name        = "appGatewayFrontendPort"
    frontend_secure_port_name = "appGatewayFrontendSecurePort"

    frontend_public_ip_configuration_name  = "appGwPublicFrontendIp"
    frontend_private_ip_configuration_name = "appGwPrivateFrontendIp"

    private_link_name = "private-link-01"

    apim_backend_settings_name = "${local.apim_prefix}-backend-pool-settings"
    cdn_backend_settings_name  = "${local.cdn_prefix}-backend-pool-settings"

    api_listener_name  = "${local.api_prefix}-listener"
    apim_listener_name = "${local.apim_prefix}-listener"
    cdn_listener_name  = "${local.cdn_prefix}-listener"

    certificate_name_api      = "api-wallet-io-pagopa-it"
    certificate_name_internal = "api-internal-wallet-io-pagopa-it"
    certificate_name_cdn      = "wallet-io-pagopa-it"

    api_routing_rule_name  = "${local.api_prefix}-routing-rule"
    apim_routing_rule_name = "${local.apim_prefix}-routing-rule"
    cdn_routing_rule_name  = "${local.cdn_prefix}-routing-rule"

    apim_probe_name = "${local.apim_prefix}-backend-pool-probe"
    cdn_probe_name  = "${local.cdn_prefix}-backend-pool-probe"

    cdn_rewrite_rule_set_name = "${local.cdn_prefix}-rewrite-rule-set"
  }
}

resource "azurerm_application_gateway" "hub" {
  provider = azurerm.hub

  name                = local.appgw.name
  location            = azurerm_resource_group.network.location
  resource_group_name = azurerm_resource_group.network.name

  zones        = ["1", "2", "3"]
  enable_http2 = false

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.appgateway.id]
  }

  sku {
    name     = "WAF_v2"
    tier     = "WAF_v2"
    capacity = 2
  }

  gateway_ip_configuration {
    name      = "appGatewayIpConfig"
    subnet_id = data.azurerm_subnet.hub_gateway_subnet.id
  }

  frontend_ip_configuration {
    name                 = local.appgw.frontend_public_ip_configuration_name
    public_ip_address_id = data.azurerm_public_ip.appgw.id
  }

  frontend_ip_configuration {
    name                            = local.appgw.frontend_private_ip_configuration_name
    private_ip_address_allocation   = "Static"
    private_ip_address              = "10.251.0.132"
    private_link_configuration_name = local.appgw.private_link_name
    subnet_id                       = data.azurerm_subnet.hub_gateway_subnet.id
  }

  frontend_port {
    name = local.appgw.frontend_port_name
    port = 80
  }

  frontend_port {
    name = local.appgw.frontend_secure_port_name
    port = 443
  }

  backend_address_pool {
    name  = local.appgw.apim_backend_pool_name
    fqdns = ["apim.internal.wallet.io.pagopa.it"]
  }

  backend_address_pool {
    name  = local.appgw.cdn_backend_pool_name
    fqdns = ["iwpitncdnst01.blob.core.windows.net"]
  }

  backend_http_settings {
    name                                = local.appgw.apim_backend_settings_name
    port                                = 443
    protocol                            = "Https"
    cookie_based_affinity               = "Disabled"
    host_name                           = "apim.internal.wallet.io.pagopa.it"
    pick_host_name_from_backend_address = false
    probe_name                          = local.appgw.apim_probe_name
    request_timeout                     = 20
  }

  backend_http_settings {
    name                                = local.appgw.cdn_backend_settings_name
    port                                = 443
    protocol                            = "Https"
    cookie_based_affinity               = "Disabled"
    pick_host_name_from_backend_address = true
    probe_name                          = local.appgw.cdn_probe_name
    request_timeout                     = 20
  }

  http_listener {
    name                           = local.appgw.apim_listener_name
    frontend_ip_configuration_name = local.appgw.frontend_private_ip_configuration_name
    frontend_port_name             = local.appgw.frontend_secure_port_name
    protocol                       = "Https"
    host_name                      = "api.internal.wallet.io.pagopa.it"
    require_sni                    = true
    ssl_certificate_name           = local.appgw.certificate_name_internal
  }

  http_listener {
    name                           = local.appgw.cdn_listener_name
    frontend_ip_configuration_name = local.appgw.frontend_public_ip_configuration_name
    frontend_port_name             = local.appgw.frontend_secure_port_name
    protocol                       = "Https"
    host_name                      = "wallet.io.pagopa.it"
    require_sni                    = true
    ssl_certificate_name           = local.appgw.certificate_name_cdn
  }

  http_listener {
    name                           = local.appgw.api_listener_name
    frontend_ip_configuration_name = local.appgw.frontend_public_ip_configuration_name
    frontend_port_name             = local.appgw.frontend_secure_port_name
    protocol                       = "Https"
    host_name                      = "api.wallet.io.pagopa.it"
    require_sni                    = true
    ssl_certificate_name           = local.appgw.certificate_name_api
  }

  request_routing_rule {
    name                       = local.appgw.apim_routing_rule_name
    priority                   = 10010
    http_listener_name         = local.appgw.apim_listener_name
    rule_type                  = "Basic"
    backend_address_pool_name  = local.appgw.apim_backend_pool_name
    backend_http_settings_name = local.appgw.apim_backend_settings_name
  }

  request_routing_rule {
    name                       = local.appgw.api_routing_rule_name
    priority                   = 10012
    http_listener_name         = local.appgw.api_listener_name
    rule_type                  = "Basic"
    backend_address_pool_name  = local.appgw.apim_backend_pool_name
    backend_http_settings_name = local.appgw.apim_backend_settings_name
  }

  request_routing_rule {
    name                       = local.appgw.cdn_routing_rule_name
    priority                   = 10020
    http_listener_name         = local.appgw.cdn_listener_name
    rule_type                  = "Basic"
    backend_address_pool_name  = local.appgw.cdn_backend_pool_name
    backend_http_settings_name = local.appgw.cdn_backend_settings_name
    rewrite_rule_set_name      = local.appgw.cdn_rewrite_rule_set_name
  }

  probe {
    name                                      = local.appgw.apim_probe_name
    protocol                                  = "Https"
    path                                      = "/status-0123456789abcdef"
    timeout                                   = 5
    interval                                  = 10
    unhealthy_threshold                       = 3
    pick_host_name_from_backend_http_settings = true

    match {
      status_code = ["200", "204"]
    }
  }

  probe {
    name                                      = local.appgw.cdn_probe_name
    protocol                                  = "Https"
    path                                      = "/well-known/openid-federation"
    timeout                                   = 5
    interval                                  = 30
    unhealthy_threshold                       = 3
    pick_host_name_from_backend_http_settings = true

    match {
      status_code = ["200"]
    }
  }

  rewrite_rule_set {
    name = local.appgw.cdn_rewrite_rule_set_name

    rewrite_rule {
      name          = "well-known-rewrite"
      rule_sequence = 100

      condition {
        variable    = "var_uri_path"
        pattern     = "^\\/\\.well-known\\/(.*)$"
        ignore_case = false
      }

      url {
        path    = "/well-known/{var_uri_path_1}"
        reroute = false
      }
    }
  }

  private_link_configuration {
    name = local.appgw.private_link_name
    ip_configuration {
      name                          = "private-link-ip-01"
      subnet_id                     = azurerm_subnet.private_links.id
      private_ip_address_allocation = "Dynamic"
      primary                       = true
    }

    ip_configuration {
      name                          = "private-link-ip-02"
      subnet_id                     = azurerm_subnet.private_links.id
      private_ip_address_allocation = "Dynamic"
      primary                       = false
    }

    ip_configuration {
      name                          = "private-link-ip-03"
      subnet_id                     = azurerm_subnet.private_links.id
      private_ip_address_allocation = "Dynamic"
      primary                       = false
    }
  }

  ssl_certificate {
    name                = local.appgw.certificate_name_internal
    key_vault_secret_id = "https://iw-p-itn-infra-kv-01.vault.azure.net:443/secrets/${local.appgw.certificate_name_internal}/"
  }

  ssl_certificate {
    name                = local.appgw.certificate_name_cdn
    key_vault_secret_id = "https://iw-p-itn-infra-kv-01.vault.azure.net:443/secrets/${local.appgw.certificate_name_cdn}/"
  }

  ssl_certificate {
    name                = local.appgw.certificate_name_api
    key_vault_secret_id = "https://iw-p-itn-infra-kv-01.vault.azure.net:443/secrets/${local.appgw.certificate_name_api}/"
  }

  ssl_policy {
    policy_type          = "Custom"
    min_protocol_version = "TLSv1_2"
    cipher_suites = [
      "TLS_RSA_WITH_AES_256_CBC_SHA256",
      "TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384",
      "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
      "TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256",
      "TLS_DHE_RSA_WITH_AES_128_GCM_SHA256",
      "TLS_RSA_WITH_AES_128_GCM_SHA256",
      "TLS_RSA_WITH_AES_128_CBC_SHA256",
    ]
  }

  waf_configuration {
    enabled                  = true
    firewall_mode            = "Detection" # TODO: restore prevention
    rule_set_type            = "OWASP"
    rule_set_version         = "3.1"
    request_body_check       = true
    max_request_body_size_kb = "128"
    file_upload_limit_mb     = "100"
  }

  global {
    request_buffering_enabled  = true
    response_buffering_enabled = true
  }

  tags = local.tags
}
