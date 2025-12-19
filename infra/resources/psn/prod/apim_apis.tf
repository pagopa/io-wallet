resource "azurerm_api_management_backend" "func_support" {
  name                = "function-support-01"
  description         = "Function App Support Backend"
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  protocol            = "http"
  url                 = "https://${module.function_apps.function_app_support.default_hostname}"
}

resource "azurerm_api_management_backend" "func_user" {
  name                = "function-user-01"
  description         = "Function App User Backend"
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  protocol            = "http"
  url                 = "https://${module.function_apps.function_app_user.default_hostname}"
}

resource "azurerm_api_management_backend" "func_user_uat" {
  name                = "function-user-uat-01"
  description         = "Function App User (UAT) Backend"
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  protocol            = "http"
  url                 = "https://${module.function_apps.function_app_user_uat.default_hostname}"
}

resource "azurerm_api_management_product" "private" {
  product_id   = "private-wallet"
  display_name = "Private Wallet"
  description  = "Product for IT-Wallet APIs with subscription"

  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name

  published             = true
  subscription_required = true
  approval_required     = false
}

resource "azurerm_api_management_product" "public" {
  product_id   = "public-wallet"
  display_name = "Public Wallet"
  description  = "Product for IT-Wallet APIs without subscription"

  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name

  published             = true
  subscription_required = false
  approval_required     = false
}

resource "azurerm_api_management_api_version_set" "user" {
  name                = "wallet-user-apis"
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  display_name        = "Wallet User"
  versioning_scheme   = "Segment"
}

resource "azurerm_api_management_api_version_set" "support" {
  name                = "wallet-support-apis"
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  display_name        = "Wallet Customer Support"
  versioning_scheme   = "Segment"
}

resource "azurerm_api_management_api" "user_v1" {
  name                  = "user-api-v1"
  api_management_name   = module.apim.name
  resource_group_name   = module.apim.resource_group_name
  subscription_required = false

  version_set_id = azurerm_api_management_api_version_set.user.id
  version        = "v1"
  revision       = 1

  description  = "REST APIs consumed by IO App"
  display_name = "IT-Wallet User"
  path         = "api/wallet"
  protocols    = ["https"]

  import {
    content_format = "openapi-link"
    content_value  = "https://raw.githubusercontent.com/pagopa/io-wallet/refs/heads/master/apps/io-wallet-user-func/openapi.yaml"
  }
}

resource "azurerm_api_management_api" "user_uat" {
  name                  = "user-api-uat"
  api_management_name   = module.apim.name
  resource_group_name   = module.apim.resource_group_name
  subscription_required = false

  version_set_id = azurerm_api_management_api_version_set.user.id
  version        = "uat"
  revision       = 1

  description  = "REST APIs consumed by IO App"
  display_name = "IT-Wallet User"
  path         = "api/wallet"
  protocols    = ["https"]

  import {
    content_format = "openapi-link"
    content_value  = "https://raw.githubusercontent.com/pagopa/io-wallet/refs/heads/master/apps/io-wallet-user-func/openapi.yaml"
  }
}

resource "azurerm_api_management_api" "support_v1" {
  name                  = "support-api-v1"
  api_management_name   = module.apim.name
  resource_group_name   = module.apim.resource_group_name
  subscription_required = false

  version_set_id = azurerm_api_management_api_version_set.support.id
  version        = "v1"
  revision       = 1

  description  = "REST APIs consumed by Customer Service Support"
  display_name = "IT-Wallet Customer Support"
  path         = "api/wallet/support"
  protocols    = ["https"]

  import {
    content_format = "openapi-link"
    content_value  = "https://raw.githubusercontent.com/pagopa/io-wallet/refs/heads/master/apps/io-wallet-support-func/openapi.yaml"
  }
}

resource "azurerm_api_management_product_api" "user" {
  api_name            = azurerm_api_management_api.user_v1.name
  product_id          = azurerm_api_management_product.public.product_id
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
}

resource "azurerm_api_management_product_api" "user_uat" {
  api_name            = azurerm_api_management_api.user_uat.name
  product_id          = azurerm_api_management_product.public.product_id
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
}

resource "azurerm_api_management_product_api" "support" {
  api_name            = azurerm_api_management_api.support_v1.name
  product_id          = azurerm_api_management_product.public.product_id
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
}

resource "azurerm_api_management_api_policy" "user_v1" {
  api_name            = azurerm_api_management_api.user_v1.name
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  xml_content         = <<XML
<policies>
  <inbound>
      <base />
      <set-backend-service backend-id="${azurerm_api_management_backend.func_user.name}" />
  </inbound>
</policies>
XML
}

resource "azurerm_api_management_api_policy" "user_uat" {
  api_name            = azurerm_api_management_api.user_uat.name
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  xml_content         = <<XML
<policies>
  <inbound>
      <base />
      <set-backend-service backend-id="${azurerm_api_management_backend.func_user_uat.name}" />
  </inbound>
</policies>
XML
}

resource "azurerm_api_management_api_policy" "support" {
  api_name            = azurerm_api_management_api.support_v1.name
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  xml_content         = <<XML
<policies>
  <inbound>
      <base />
      <set-backend-service backend-id="${azurerm_api_management_backend.func_support.name}" />
  </inbound>
</policies>
XML
}
