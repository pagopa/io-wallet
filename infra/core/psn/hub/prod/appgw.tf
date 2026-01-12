locals {
  apim_prefix = "apim"

  appgw = {
    name = "pagopa-app-gw-italynorth"

    apim_backend_pool_name = "${local.apim_prefix}-backend-pool"

    frontend_port_name        = "appGatewayFrontendPort"
    frontend_secure_port_name = "appGatewayFrontendSecurePort"

    frontend_public_ip_configuration_name  = "appGwPublicFrontendIpIPv4"
    frontend_private_ip_configuration_name = "appGwPrivateFrontendIp"

    private_link_name = "private-link-01"

    apim_backend_settings_name = "${local.apim_prefix}-backend-pool-settings"

    apim_listener_name = "${local.apim_prefix}-listener"

    certificate_name_internal = "api-internal-wallet-io-pagopa-it"

    apim_routing_rule_name = "${local.apim_prefix}-routing-rule"

    apim_probe_name = "${local.apim_prefix}-backend-pool-probe"
  }
}

resource "azurerm_application_gateway" "hub" {
  provider = azurerm.hub

  name                = local.appgw.name
  location            = azurerm_resource_group.network.location
  resource_group_name = azurerm_resource_group.network.name

  zones        = ["1", "2", "3"]
  enable_http2 = true

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.appgateway.id]
  }

  sku {
    name     = "WAF_v2"
    tier     = "WAF_v2"
    capacity = null
  }

  autoscale_configuration {
    min_capacity = 1
    max_capacity = 2
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
    private_ip_address              = "10.251.3.6" # first 5 ips are reserved https://learn.microsoft.com/en-us/azure/application-gateway/configuration-infrastructure
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

  backend_http_settings {
    name                                = local.appgw.apim_backend_settings_name
    port                                = 443
    protocol                            = "Https"
    cookie_based_affinity               = "Disabled"
    pick_host_name_from_backend_address = true
    probe_name                          = local.appgw.apim_probe_name
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
    firewall_policy_id             = azurerm_web_application_firewall_policy.apim.id # each listener must have its own waf policy
  }

  request_routing_rule {
    name                       = local.appgw.apim_routing_rule_name
    priority                   = 10000
    http_listener_name         = local.appgw.apim_listener_name
    rule_type                  = "Basic"
    backend_address_pool_name  = local.appgw.apim_backend_pool_name
    backend_http_settings_name = local.appgw.apim_backend_settings_name
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
    name                = local.appgw.certificate_name_internal
    key_vault_secret_id = "https://iw-p-itn-infra-kv-01.vault.azure.net:443/secrets/${local.appgw.certificate_name_internal}/"
  }

  firewall_policy_id = data.azurerm_web_application_firewall_policy.appgw.id

  global {
    request_buffering_enabled  = true
    response_buffering_enabled = true
  }

  tags = local.tags
}
