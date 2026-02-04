resource "azurerm_role_assignment" "func_app_user_cdn_endpoint_contributor" {
  scope                = var.cdn_endpoint_id
  role_definition_name = "CDN Profile Contributor"
  principal_id         = var.function_app.user_func.principal_id
  description          = "Allow Function App user to manage Front Door profile"
}
