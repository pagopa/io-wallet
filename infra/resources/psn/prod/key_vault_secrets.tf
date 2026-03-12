# tfsec:ignore:azure-keyvault-ensure-secret-expiry
# This is going to be replaced by user_uat_fn_default_key
resource "azurerm_key_vault_secret" "func_user_uat_default_key" {
  name         = "function-user-uat-default-key"
  value        = module.function_apps.function_app_user_uat.default_key
  key_vault_id = module.key_vault_app.key_vault_wallet.id
  content_type = "token"
}

# tfsec:ignore:azure-keyvault-ensure-secret-expiry
# This is going to be replaced by support_fn_default_key
resource "azurerm_key_vault_secret" "func_support_default_key" {
  name         = "function-support-default-key"
  value        = module.function_apps.function_app_support.default_key
  key_vault_id = module.key_vault_app.key_vault_wallet.id
  content_type = "token"
}

# tfsec:ignore:azure-keyvault-ensure-secret-expiry
# This is going to be replaced by application_insights_connection_string
resource "azurerm_key_vault_secret" "app_insights_connection_string" {
  name         = "AppInsightsConnectionString"
  value        = data.azurerm_application_insights.core.connection_string
  key_vault_id = module.key_vault_app.key_vault_wallet.id
  content_type = "token"
}

resource "azurerm_key_vault_secret" "user_ioweb_fn_key" {
  name             = "user-ioweb-fn-key"
  key_vault_id     = module.key_vault_app.key_vault_wallet.id
  value_wo         = ""
  value_wo_version = 1
}

resource "azurerm_key_vault_secret" "user_ioapp_fn_key" {
  name             = "user-ioapp-fn-key"
  key_vault_id     = module.key_vault_app.key_vault_wallet.id
  value_wo         = ""
  value_wo_version = 1
}

resource "azurerm_key_vault_secret" "user_uat_fn_default_key" {
  name             = "user-fn-uat-default-key"
  key_vault_id     = module.key_vault_app.key_vault_wallet.id
  value_wo         = ""
  value_wo_version = 1
}

resource "azurerm_key_vault_secret" "support_fn_default_key" {
  name             = "support-fn-default-key"
  key_vault_id     = module.key_vault_app.key_vault_wallet.id
  value_wo         = ""
  value_wo_version = 1
}

resource "azurerm_key_vault_secret" "application_insights_connection_string" {
  name             = "ApplicationInsightsConnectionString"
  key_vault_id     = module.key_vault_app.key_vault_wallet.id
  value_wo         = data.azurerm_application_insights.core.connection_string
  value_wo_version = 1
}
