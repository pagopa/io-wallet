locals {
  appgw = {
    name                                   = "pagopa-app-gw-italynorth"
    backend_address_pool_name              = "appGatewayBackendPool"
    frontend_port_name                     = "appGatewayFrontendPort"
    frontend_secure_port_name              = "appGatewayFrontendSecurePort"
    frontend_public_ip_configuration_name  = "appGwPublicFrontendIp"
    frontend_private_ip_configuration_name = "appGwPrivateFrontendIp"
    private_link_name                      = "private-link-01"
    http_setting_name                      = "appGatewayBackendHttpSettings"
    http_listener_name                     = "appGatewayHttpListener"
    https_listener_name                    = "appGatewayHttpsListener"

    request_routing_rule_name = "appGatewayRule"
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
    name  = local.appgw.backend_address_pool_name
    fqdns = ["iw-p-itn-apps-apim-01.azure-api.net"]
  }

  backend_http_settings {
    name                                = local.appgw.http_setting_name
    port                                = 443
    protocol                            = "Https"
    cookie_based_affinity               = "Disabled"
    pick_host_name_from_backend_address = true
    probe_name                          = "${local.appgw.backend_address_pool_name}-probe"
    request_timeout                     = 20
  }

  http_listener {
    name                           = local.appgw.http_listener_name
    frontend_ip_configuration_name = local.appgw.frontend_private_ip_configuration_name
    frontend_port_name             = local.appgw.frontend_port_name
    protocol                       = "Http"
    require_sni                    = false
  }

  http_listener {
    name                           = local.appgw.https_listener_name
    frontend_ip_configuration_name = local.appgw.frontend_private_ip_configuration_name
    frontend_port_name             = local.appgw.frontend_secure_port_name
    protocol                       = "Https"
    require_sni                    = false
    ssl_certificate_name           = "psn-internal-io-pagopa-it"
  }

  request_routing_rule {
    name                       = local.appgw.request_routing_rule_name
    priority                   = 10010
    http_listener_name         = local.appgw.https_listener_name
    rule_type                  = "Basic"
    backend_address_pool_name  = local.appgw.backend_address_pool_name
    backend_http_settings_name = local.appgw.http_setting_name
  }

  probe {
    name                                      = "${local.appgw.backend_address_pool_name}-probe"
    protocol                                  = "Https"
    path                                      = "/"
    timeout                                   = 5
    interval                                  = 10
    unhealthy_threshold                       = 3
    pick_host_name_from_backend_http_settings = true

    match {
      status_code = ["200"]
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
    name                = "psn-internal-io-pagopa-it"
    key_vault_secret_id = "https://iw-p-itn-infra-kv-01.vault.azure.net:443/secrets/psn-internal-io-pagopa-it/"
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
