# tfsec:ignore:azure-keyvault-ensure-secret-expiry
resource "azurerm_key_vault_secret" "func_user_default_key" {
  name         = "funciowallet-KEY-APPBACKEND"
  value        = data.azurerm_function_app_host_keys.this.default_function_key
  key_vault_id = var.key_vault_id
  content_type = "token"
}

# tfsec:ignore:azure-keyvault-ensure-secret-expiry
resource "azurerm_key_vault_secret" "func_support_default_key" {
  name         = "io-wallet-support-func-key"
  value        = data.azurerm_function_app_host_keys.support_func.default_function_key
  key_vault_id = var.key_vault_wallet_id
  content_type = "token"
}
