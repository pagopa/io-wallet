output "function_app_user_02" {
  value = {
    id                   = module.function_app_user_02.function_app.function_app.id
    name                 = module.function_app_user_02.function_app.function_app.name
    resource_group_name  = module.function_app_user_02.function_app.resource_group_name
    principal_id         = module.function_app_user_02.function_app.function_app.principal_id
    staging_principal_id = module.function_app_user_02.function_app.function_app.slot.principal_id
    default_hostname     = module.function_app_user_02.function_app.function_app.default_hostname
  }
}

output "function_app_support" {
  value = {
    name                 = module.function_app_support.function_app.function_app.name
    principal_id         = module.function_app_support.function_app.function_app.principal_id
    staging_principal_id = module.function_app_support.function_app.function_app.slot.principal_id
    resource_group_name  = module.function_app_support.function_app.resource_group_name
    default_hostname     = module.function_app_support.function_app.function_app.default_hostname
  }
}

output "function_app_user_uat" {
  value = {
    principal_id         = module.function_app_user_uat.function_app.function_app.principal_id
    staging_principal_id = module.function_app_user_uat.function_app.function_app.slot.principal_id
  }
}
