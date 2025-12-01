locals {
  appgw_name = "pagopa-app-gw-italynorth"

  backend_address_pool_name      = "appGatewayBackendPool"
  frontend_port_name             = "appGatewayFrontendPort"
  frontend_ip_configuration_name = "appGwPublicFrontendIp"
  http_setting_name              = "appGatewayBackendHttpSettings"
  listener_name                  = "appGatewayHttpListener"
  request_routing_rule_name      = "appGatewayRule"
}

resource "azurerm_application_gateway" "hub" {
  provider = azurerm.hub

  name                = local.appgw_name
  location            = azurerm_resource_group.network.location
  resource_group_name = azurerm_resource_group.network.name

  zones        = ["1", "2", "3"]
  enable_http2 = false

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
    name                 = local.frontend_ip_configuration_name
    public_ip_address_id = data.azurerm_public_ip.appgw.id
  }

  frontend_port {
    name = local.frontend_port_name
    port = 80
  }

  backend_address_pool {
    name = local.backend_address_pool_name
  }

  backend_http_settings {
    name                                = local.http_setting_name
    port                                = 443
    protocol                            = "Https"
    cookie_based_affinity               = "Disabled"
    pick_host_name_from_backend_address = true
    request_timeout                     = 20
  }

  http_listener {
    name                           = local.listener_name
    frontend_ip_configuration_name = local.frontend_ip_configuration_name
    frontend_port_name             = local.frontend_port_name
    protocol                       = "Http"
    require_sni                    = false
  }

  request_routing_rule {
    name                       = local.request_routing_rule_name
    priority                   = 10010
    http_listener_name         = local.listener_name
    rule_type                  = "Basic"
    backend_address_pool_name  = local.backend_address_pool_name
    backend_http_settings_name = local.http_setting_name
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

  tags = local.tags
}
