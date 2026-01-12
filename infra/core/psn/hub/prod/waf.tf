resource "azurerm_web_application_firewall_policy" "apim" {
  provider = azurerm.hub

  name                = "${local.environment.prefix}-${local.environment.environment}-itn-appgw-apim-waf-${local.environment.instance_number}"
  resource_group_name = azurerm_resource_group.network.name
  location            = local.environment.location

  managed_rules {
    managed_rule_set {
      type    = "OWASP"
      version = "3.2"
    }
    managed_rule_set {
      type    = "Microsoft_BotManagerRuleSet"
      version = "1.1"
    }
  }

  policy_settings {
    request_body_check      = true
    file_upload_enforcement = true
    mode                    = "Detection"
  }

  tags = local.tags
}
