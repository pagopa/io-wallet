# tfsec:ignore:azure-keyvault-ensure-secret-expiry
resource "azurerm_key_vault_secret" "func_user_default_key" {
  name         = "funciowallet-KEY-APPBACKEND"
  value        = module.function_apps.function_app_user.default_key
  key_vault_id = data.azurerm_key_vault.weu_common.id
  content_type = "token"
}

# tfsec:ignore:azure-keyvault-ensure-secret-expiry
resource "azurerm_key_vault_secret" "func_user_uat_default_key" {
  name         = "funciowalletuat-KEY-APPBACKEND"
  value        = module.function_apps.function_app_user_uat.default_key
  key_vault_id = data.azurerm_key_vault.weu_common.id
  content_type = "token"
}

# tfsec:ignore:azure-keyvault-ensure-secret-expiry
resource "azurerm_key_vault_secret" "func_support_default_key" {
  name         = "io-wallet-support-func-key"
  value        = module.function_apps.function_app_support.default_key
  key_vault_id = module.key_vaults.key_vault_wallet.id
  content_type = "token"
}


# tfsec:ignore:azure-keyvault-ensure-secret-expiry
resource "azurerm_key_vault_secret" "app_insights_connection_string" {
  name         = "AppInsightsConnectionString"
  value        = data.azurerm_application_insights.common.connection_string
  key_vault_id = module.key_vaults.key_vault_wallet.id
  content_type = "token"
}
