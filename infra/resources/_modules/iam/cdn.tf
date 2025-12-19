resource "azurerm_role_assignment" "func_app_user_cdn_endpoint_contributor" {
  scope                = var.front_door_endpoint_id
  role_definition_name = "CDN Endpoint Contributor"
  principal_id         = var.function_app.user_func.principal_id
  description          = "Allow Function App user to manage CDN endpoint"
}