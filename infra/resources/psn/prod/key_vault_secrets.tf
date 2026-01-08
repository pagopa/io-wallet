# tfsec:ignore:azure-keyvault-ensure-secret-expiry
resource "azurerm_key_vault_secret" "func_user_uat_default_key" {
  name         = "function-user-uat-default-key"
  value        = module.function_apps.function_app_user_uat.default_key
  key_vault_id = module.key_vault_app.key_vault_wallet.id
  content_type = "token"
}

# tfsec:ignore:azure-keyvault-ensure-secret-expiry
resource "azurerm_key_vault_secret" "func_support_default_key" {
  name         = "function-support-default-key"
  value        = module.function_apps.function_app_support.default_key
  key_vault_id = module.key_vault_app.key_vault_wallet.id
  content_type = "token"
}

# tfsec:ignore:azure-keyvault-ensure-secret-expiry
resource "azurerm_key_vault_secret" "app_insights_connection_string" {
  name         = "AppInsightsConnectionString"
  value        = data.azurerm_application_insights.core.connection_string
  key_vault_id = module.key_vault_app.key_vault_wallet.id
  content_type = "token"
}
