resource "azurerm_role_assignment" "kv_admins" {
  for_each = var.key_vault.admin_ids

  role_definition_name = "Key Vault Administrator"
  scope                = var.key_vault.id
  principal_id         = each.value
}

resource "azurerm_role_assignment" "func_app_user_to_kv_secrets" {
  role_definition_name = "Key Vault Secrets User"
  scope                = var.key_vault.id
  principal_id         = var.function_app.principal_id
}

resource "azurerm_role_assignment" "func_app_user_staging_slot_to_kv_secrets" {
  for_each = var.function_app.staging_principal_id == null ? [] : toset([])

  role_definition_name = "Key Vault Secrets User"
  scope                = var.key_vault.id
  principal_id         = var.function_app.staging_principal_id
}
