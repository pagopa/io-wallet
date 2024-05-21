output "function_app_walet" {
  value = {
    id                  = module.function.function_app.function_app.id
    name                = module.function.function_app.function_app.name
    resource_group_name = module.function.function_app.resource_group_name
  }
}
