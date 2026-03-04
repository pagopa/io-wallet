resource "azurerm_api_management_tag" "wallet" {
  api_management_id = var.apim.id
  name              = "itwallet"
}

// IO WEB API
module "apim_v2_web_wallet_api" {
  source = "git::https://github.com/pagopa/terraform-azurerm-v4//api_management_api?ref=v1.0.0"

  name                  = format("%s-ioweb-wallet", var.project_legacy)
  api_management_name   = var.apim.name
  resource_group_name   = var.apim.resource_group_name
  product_ids           = [var.product_id]
  subscription_required = false

  service_url = "https://api.internal.wallet.io.pagopa.it/api/wallet/ioweb/v1"

  description  = "APIs consumed by IO WEB application"
  display_name = "IO Web - Wallet"
  path         = "ioweb/wallet/api/${var.revision}"
  protocols    = ["https"]
  revision     = "2"

  content_format = "openapi"

  content_value = file("${path.module}/api/ioweb/swagger.yaml")

  xml_content = file("${path.module}/api/ioweb/base_policy.xml")
}

resource "azurerm_api_management_api_tag" "wallet_web" {
  api_id = module.apim_v2_web_wallet_api.id
  name   = azurerm_api_management_tag.wallet.name
}

resource "azurerm_api_management_api_operation_policy" "get_current_wallet_instance_status_policy" {
  api_name            = module.apim_v2_web_wallet_api.name
  operation_id        = "getCurrentWalletInstanceStatus"
  resource_group_name = var.apim.resource_group_name
  api_management_name = var.apim.name

  xml_content = file("${path.module}/api/ioweb/get_current_wallet_instance_status_policy.xml")
}

resource "azurerm_api_management_api_operation_policy" "set_wallet_instance_status_policy" {
  api_name            = module.apim_v2_web_wallet_api.name
  operation_id        = "setWalletInstanceStatus"
  resource_group_name = var.apim.resource_group_name
  api_management_name = var.apim.name

  xml_content = file("${path.module}/api/ioweb/set_wallet_instance_status_policy.xml")
}

resource "azurerm_api_management_api_operation_policy" "is_fiscal_code_whitelisted_policy" {
  api_name            = module.apim_v2_web_wallet_api.name
  operation_id        = "isFiscalCodeWhitelisted"
  resource_group_name = var.apim.resource_group_name
  api_management_name = var.apim.name

  xml_content = file("${path.module}/api/ioweb/is_fiscal_code_whitelisted.xml")
}

// SUPPORT API
module "apim_v2_wallet_support_api" {
  source = "git::https://github.com/pagopa/terraform-azurerm-v4//api_management_api?ref=v1.0.0"

  name                  = format("%s-wallet-support-api", var.project_legacy)
  api_management_name   = var.apim.name
  resource_group_name   = var.apim.resource_group_name
  product_ids           = [module.apim_v2_wallet_support_product.product_id]
  subscription_required = true

  service_url = "https://api.internal.wallet.io.pagopa.it/api/wallet/support/v1"

  description  = "API for Wallet Support Assistance"
  display_name = "IO Wallet - Support API"
  path         = "api/v1/wallet/support"
  protocols    = ["https"]
  revision     = "2"

  content_format = "openapi"
  content_value  = file("${path.module}/api/support/swagger.yaml")
}

resource "azurerm_api_management_api_tag" "wallet_support" {
  api_id = module.apim_v2_wallet_support_api.id
  name   = azurerm_api_management_tag.wallet.name
}

// PDND API
# module "apim_v2_wallet_pdnd_api" {
#   source = "git::https://github.com/pagopa/terraform-azurerm-v4//api_management_api?ref=v1.0.0"

#   name                  = format("%s-wallet-pdnd-api", var.project_legacy)
#   api_management_name   = var.apim.name
#   resource_group_name   = var.apim.resource_group_name
#   product_ids           = [module.apim_v2_wallet_pdnd_product.product_id]
#   subscription_required = false

#   service_url = format("https://%s/api/v1/wallet", var.function_apps.user_function.function_hostname)

#   description  = "API access limited by PDND token authentication"
#   display_name = "IO Wallet - PDND"
#   path         = "api/v1/wallet/pdnd"
#   protocols    = ["https"]

#   content_format = "openapi"

#   content_value = file("${path.module}/api/pdnd/swagger.yaml")

#   xml_content = file("${path.module}/api/pdnd/base_policy.xml")
# }

# resource "azurerm_api_management_api_tag" "wallet_pdnd" {
#   api_id = module.apim_v2_wallet_pdnd_api.id
#   name   = azurerm_api_management_tag.wallet.name
# }

# resource "azurerm_api_management_api_operation_policy" "health_check_pdnd_policy" {
#   api_name            = module.apim_v2_wallet_pdnd_api.name
#   operation_id        = "healthCheck"
#   resource_group_name = var.apim.resource_group_name
#   api_management_name = var.apim.name

#   xml_content = file("${path.module}/api/pdnd/health_check_policy.xml")
# }