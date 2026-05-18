resource "azurerm_role_assignment" "func_app_user_cdn_endpoint_contributor" {
  scope                = var.cdn_endpoint_id
  role_definition_name = "CDN Profile Contributor"
  principal_id         = var.function_app.user_func.principal_id
  description          = "Allow Function App user to manage Front Door profile"
}

resource "azurerm_role_assignment" "func_app_user_uat_cdn_endpoint_contributor" {
  scope                = var.cdn_endpoint_id_uat
  role_definition_name = "CDN Profile Contributor"
  principal_id         = var.function_app.user_func_uat.principal_id
  description          = "Allow Function App user UAT to manage Front Door profile"
}
