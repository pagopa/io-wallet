data "azurerm_function_app_host_keys" "this" {
  name                = module.function_app_user.function_app.function_app.name
  resource_group_name = module.function_app_user.function_app.resource_group_name
}

data "azurerm_function_app_host_keys" "support_func" {
  name                = module.function_app_support.function_app.function_app.name
  resource_group_name = module.function_app_support.function_app.resource_group_name
}
