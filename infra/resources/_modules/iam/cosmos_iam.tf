resource "azurerm_cosmosdb_sql_role_assignment" "func_app_user_to_cosmos_data_reader_db" {
  for_each = var.cosmos_db.database_names

  resource_group_name = var.cosmos_db.resource_group_name
  account_name        = var.cosmos_db.name
  role_definition_id  = "${var.cosmos_db.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = var.function_app.principal_id
  scope               = "${var.cosmos_db.id}/dbs/${each.value}"
}

resource "azurerm_cosmosdb_sql_role_assignment" "func_app_user_staging_slot_to_cosmos_data_reader_db" {
  for_each = var.function_app.staging_principal_id == null ? [] : var.cosmos_db.database_names

  resource_group_name = var.cosmos_db.resource_group_name
  account_name        = var.cosmos_db.name
  role_definition_id  = "${var.cosmos_db.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = var.function_app.staging_principal_id
  scope               = "${var.cosmos_db.id}/dbs/${each.value}"
}
