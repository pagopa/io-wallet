resource "azurerm_role_assignment" "func_app_user_slot_to_cdn_storage_account_blob_data_contributor" {
  scope                = var.cdn_storage_account_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = var.function_app.principal_id
}

resource "azurerm_role_assignment" "func_app_user_staging_slot_to_cdn_storage_account_blob_data_contributor" {
  for_each = var.function_app.staging_principal_id == null ? [] : toset(["1"])

  scope                = var.cdn_storage_account_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = var.function_app.staging_principal_id
}

resource "azurerm_role_assignment" "cdn_contributors" {
  for_each = var.key_vault.admin_ids

  scope                = var.cdn_storage_account_id
  role_definition_name = "Storage Blob Data Owner"
  principal_id         = each.value
}
