output "app_service_plan_common" {
  value = {
    id       = azurerm_app_service_plan.app_service_plan_wallet_common.id
    name     = azurerm_app_service_plan.app_service_plan_wallet_common.name
    location = azurerm_app_service_plan.app_service_plan_wallet_common.location
  }
}

output "function_app_wallet" {
  value = {
    id       = module.function_wallet.id
    name     = module.function_wallet.name
    hostname = module.function_wallet.default_hostname
  }
}
