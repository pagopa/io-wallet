resource "azurerm_role_assignment" "func_app_user_cdn_endpoint_contributor" {
  scope                = var.cdn_endpoint_id
  role_definition_name = var.cdn_frontdoor ? "CDN Profile Contributor" : "CDN Endpoint Contributor"
  principal_id         = var.function_app.user_func.principal_id
  description          = var.cdn_frontdoor ? "Allow Function App user to manage Front Door profile" : "Allow Function App user to manage CDN endpoint"
}
