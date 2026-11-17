moved {
  from = azurerm_role_assignment.func_app_user_cdn_endpoint_contributor
  to   = azurerm_role_assignment.func_app_user_cdn_endpoint_contributor["01"]
}

resource "azurerm_role_assignment" "func_app_user_cdn_endpoint_contributor" {
  for_each = local.user_function_apps

  scope                = var.cdn_endpoint_id
  role_definition_name = "CDN Profile Contributor"
  principal_id         = each.value.principal_id
  description          = "Allow Function App user to manage Front Door profile"
}

resource "azurerm_role_assignment" "func_app_user_uat_cdn_endpoint_contributor" {
  scope                = var.cdn_endpoint_id_uat
  role_definition_name = "CDN Profile Contributor"
  principal_id         = var.function_app.user_func_uat.principal_id
  description          = "Allow Function App user UAT to manage Front Door profile"
}
