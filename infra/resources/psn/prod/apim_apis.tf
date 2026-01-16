resource "azurerm_api_management_named_value" "func_support_key" {
  name                = "support-func-default-key"
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  display_name        = "SupportDefaultFunctionKey"
  secret              = true
  value               = azurerm_key_vault_secret.func_support_default_key.value
}

resource "azurerm_api_management_named_value" "func_user_uat_key" {
  name                = "user-uat-func-default-key"
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  display_name        = "UserUatDefaultFunctionKey"
  secret              = true
  value               = azurerm_key_vault_secret.func_user_uat_default_key.value
}

resource "azurerm_api_management_named_value" "func_user_ioapp_key" {
  name                = "user-func-ioapp-key"
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  display_name        = "UserIOAppFunctionKey"
  secret              = true
  value               = data.azurerm_key_vault_secret.function_user_ioapp_key.value
}

resource "azurerm_api_management_named_value" "func_user_ioweb_key" {
  name                = "user-func-ioweb-key"
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  display_name        = "UserIOWebFunctionKey"
  secret              = true
  value               = data.azurerm_key_vault_secret.function_user_ioweb_key.value
}

resource "azurerm_api_management_backend" "func_support" {
  name                = "function-support-01"
  description         = "Function App Support Backend"
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  protocol            = "http"
  url                 = "https://${module.function_apps.function_app_support.default_hostname}${local.backend_paths.support_v1}"

  credentials {
    header = {
      "x-functions-key" = "{{${azurerm_api_management_named_value.func_support_key.name}}}"
    }
  }
}

resource "azurerm_api_management_backend" "func_user" {
  name                = "function-user-01"
  description         = "Function App User Backend"
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  protocol            = "http"
  url                 = "https://${module.function_apps.function_app_user.default_hostname}${local.backend_paths.user_v1}"
}

resource "azurerm_api_management_backend" "func_user_uat" {
  name                = "function-user-uat-01"
  description         = "Function App User (UAT) Backend"
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  protocol            = "http"
  url                 = "https://${module.function_apps.function_app_user_uat.default_hostname}${local.backend_paths.user_uat}"

  credentials {
    header = {
      "x-functions-key" = "{{${azurerm_api_management_named_value.func_user_uat_key.name}}}"
    }
  }
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

resource "azurerm_api_management_api_version_set" "user_ioapp" {
  name                = "wallet-user-ioapp-apis"
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  display_name        = "Wallet User - IO App"
  versioning_scheme   = "Segment"
}

resource "azurerm_api_management_api_version_set" "user_ioweb" {
  name                = "wallet-user-ioweb-apis"
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  display_name        = "Wallet User - IO Web"
  versioning_scheme   = "Segment"
}

resource "azurerm_api_management_api_version_set" "user_uat_ioapp" {
  name                = "wallet-user-uat-ioapp-apis"
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  display_name        = "Wallet User UAT - IO App"
  versioning_scheme   = "Segment"
}

resource "azurerm_api_management_api_version_set" "support" {
  name                = "wallet-support-apis"
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  display_name        = "Wallet Customer Support"
  versioning_scheme   = "Segment"
}

resource "azurerm_api_management_api" "user_ioapp_v1" {
  name                  = "user-ioapp-api-v1"
  api_management_name   = module.apim.name
  resource_group_name   = module.apim.resource_group_name
  subscription_required = false

  version_set_id = azurerm_api_management_api_version_set.user_ioapp.id
  version        = "v1"
  revision       = 1

  description  = "REST APIs consumed by IO App"
  display_name = "IT-Wallet User - IO App v1"
  path         = "api/wallet"
  protocols    = ["https"]

  import {
    content_format = "openapi"
    content_value  = file("${path.module}/apim/api/user/swagger.yaml")
  }
}

resource "azurerm_api_management_api" "user_ioweb_v1" {
  name                  = "user-ioweb-api-v1"
  api_management_name   = module.apim.name
  resource_group_name   = module.apim.resource_group_name
  subscription_required = false

  version_set_id = azurerm_api_management_api_version_set.user_ioweb.id
  version        = "v1"
  revision       = 1

  description  = "REST APIs consumed by IO Web"
  display_name = "IT-Wallet User - IO Web v1"
  path         = "api/wallet/ioweb"
  protocols    = ["https"]

  import {
    content_format = "openapi"
    content_value  = file("${path.module}/apim/api/ioweb/swagger.yaml")
  }
}

resource "azurerm_api_management_api" "user_uat_ioapp_v1" {
  name                  = "user-uat-ioapp-api-v1"
  api_management_name   = module.apim.name
  resource_group_name   = module.apim.resource_group_name
  subscription_required = false

  version_set_id = azurerm_api_management_api_version_set.user_uat_ioapp.id
  version        = "v1"
  revision       = 1

  description  = "REST APIs consumed by IO App"
  display_name = "IT-Wallet User UAT - IO App v1"
  path         = "api/wallet/uat"
  protocols    = ["https"]

  import {
    content_format = "openapi"
    content_value  = file("${path.module}/apim/api/user-uat/swagger.yaml")
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
    content_format = "openapi"
    content_value  = file("${path.module}/apim/api/support/swagger.yaml")
  }
}

resource "azurerm_api_management_product_api" "user_ioapp" {
  api_name            = azurerm_api_management_api.user_ioapp_v1.name
  product_id          = azurerm_api_management_product.public.product_id
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
}

resource "azurerm_api_management_product_api" "user_ioweb" {
  api_name            = azurerm_api_management_api.user_ioweb_v1.name
  product_id          = azurerm_api_management_product.public.product_id
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
}

resource "azurerm_api_management_product_api" "user_uat_ioapp" {
  api_name            = azurerm_api_management_api.user_uat_ioapp_v1.name
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

resource "azurerm_api_management_tag" "support" {
  api_management_id = module.apim.id
  name              = "customer-support"
}

resource "azurerm_api_management_tag" "user" {
  api_management_id = module.apim.id
  name              = "user"
}

resource "azurerm_api_management_tag" "uat" {
  api_management_id = module.apim.id
  name              = "uat"
}

resource "azurerm_api_management_tag" "user_ioapp" {
  api_management_id = module.apim.id
  name              = "user-ioapp"
}

resource "azurerm_api_management_tag" "user_ioweb" {
  api_management_id = module.apim.id
  name              = "user-ioweb"
}

resource "azurerm_api_management_api_tag" "support_v1_support" {
  api_id = azurerm_api_management_api.support_v1.id
  name   = azurerm_api_management_tag.support.name
}

resource "azurerm_api_management_api_tag" "user_ioapp_v1_user" {
  api_id = azurerm_api_management_api.user_ioapp_v1.id
  name   = azurerm_api_management_tag.user.name
}

resource "azurerm_api_management_api_tag" "user_uat_ioapp_v1_user" {
  api_id = azurerm_api_management_api.user_uat_ioapp_v1.id
  name   = azurerm_api_management_tag.user.name
}

resource "azurerm_api_management_api_tag" "user_ioweb_v1_user" {
  api_id = azurerm_api_management_api.user_ioweb_v1.id
  name   = azurerm_api_management_tag.user.name
}

resource "azurerm_api_management_api_tag" "user_uat_ioapp_v1_uat" {
  api_id = azurerm_api_management_api.user_uat_ioapp_v1.id
  name   = azurerm_api_management_tag.uat.name
}

resource "azurerm_api_management_api_tag" "user_ioapp_v1_ioapp" {
  api_id = azurerm_api_management_api.user_ioapp_v1.id
  name   = azurerm_api_management_tag.user_ioapp.name
}

resource "azurerm_api_management_api_tag" "user_uat_ioapp_v1_ioapp" {
  api_id = azurerm_api_management_api.user_uat_ioapp_v1.id
  name   = azurerm_api_management_tag.user_ioapp.name
}

resource "azurerm_api_management_api_policy" "user_ioapp_v1" {
  api_name            = azurerm_api_management_api.user_ioapp_v1.name
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  xml_content         = <<XML
<policies>
  <inbound>
      <base />
      <set-header name="x-functions-key" exists-action="override">
        <value>{{${azurerm_api_management_named_value.func_user_ioapp_key.display_name}}}</value>
      </set-header>
      <set-backend-service backend-id="${azurerm_api_management_backend.func_user.name}" />
  </inbound>
</policies>
XML
}

resource "azurerm_api_management_api_policy" "user_ioweb_v1" {
  api_name            = azurerm_api_management_api.user_ioweb_v1.name
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  xml_content         = <<XML
<policies>
  <inbound>
      <base />
      <set-header name="x-functions-key" exists-action="override">
        <value>{{${azurerm_api_management_named_value.func_user_ioweb_key.display_name}}}</value>
      </set-header>
      <set-backend-service backend-id="${azurerm_api_management_backend.func_user.name}" />
  </inbound>
</policies>
XML
}

resource "azurerm_api_management_api_policy" "user_uat_ioapp_v1" {
  api_name            = azurerm_api_management_api.user_uat_ioapp_v1.name
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

resource "azurerm_api_management_policy_fragment" "extract_user_fiscal_code" {
  name              = "extract-user-fiscal-code"
  description       = "Extract user fiscal code from x-user header"
  api_management_id = data.azurerm_api_management.platform_api_gateway.id
  format            = "rawxml"
  value             = file("${path.module}/fragments/extract-user-fiscal-code.xml")
}

resource "azurerm_api_management_api_operation_policy" "is_fiscal_code_whitelisted_policy" {
  api_name            = azurerm_api_management_api.wallet_user_ioapp_v1.name
  operation_id        = "isFiscalCodeWhitelisted"
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  api_management_name = data.azurerm_api_management.platform_api_gateway.name

  xml_content = file("${path.module}/policies/is_fiscal_code_whitelisted_operation_policy.xml")
}

resource "azurerm_api_management_api_operation_policy" "create_wallet_attestation_policy" {
  api_name            = azurerm_api_management_api.wallet_user_ioapp_v1.name
  operation_id        = "createWalletAttestation"
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  api_management_name = data.azurerm_api_management.platform_api_gateway.name

  xml_content = file("${path.module}/policies/inject_fiscal_code_into_body.xml")
}

resource "azurerm_api_management_api_operation_policy" "create_wallet_instance_policy" {
  api_name            = azurerm_api_management_api.wallet_user_ioapp_v1.name
  operation_id        = "createWalletInstance"
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  api_management_name = data.azurerm_api_management.platform_api_gateway.name

  xml_content = file("${path.module}/policies/inject_fiscal_code_into_body.xml")
}

resource "azurerm_api_management_api_operation_policy" "set_wallet_instance_status_policy" {
  api_name            = azurerm_api_management_api.wallet_user_ioapp_v1.name
  operation_id        = "setWalletInstanceStatus"
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  api_management_name = data.azurerm_api_management.platform_api_gateway.name

  xml_content = file("${path.module}/policies/inject_fiscal_code_into_body.xml")
}

resource "azurerm_api_management_api_operation_policy" "get_wallet_instance_status_policy" {
  api_name            = azurerm_api_management_api.wallet_user_uat_ioapp_v1.name
  operation_id        = "getWalletInstanceStatus"
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  api_management_name = data.azurerm_api_management.platform_api_gateway.name

  xml_content = file("${path.module}/policies/set_fiscal_code_from_header.xml")
}

resource "azurerm_api_management_api_operation_policy" "get_current_wallet_instance_status_policy" {
  api_name            = azurerm_api_management_api.wallet_user_uat_ioapp_v1.name
  operation_id        = "getCurrentWalletInstanceStatus"
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  api_management_name = data.azurerm_api_management.platform_api_gateway.name

  xml_content = file("${path.module}/policies/set_fiscal_code_from_header.xml")
}

resource "azurerm_api_management_api_operation_policy" "is_fiscal_code_whitelisted_uat_policy" {
  api_name            = azurerm_api_management_api.wallet_user_uat_ioapp_v1.name
  operation_id        = "isFiscalCodeWhitelisted"
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  api_management_name = data.azurerm_api_management.platform_api_gateway.name

  xml_content = file("${path.module}/policies/is_fiscal_code_whitelisted_operation_policy.xml")
}

resource "azurerm_api_management_api_operation_policy" "create_wallet_attestation_uat_policy" {
  api_name            = azurerm_api_management_api.wallet_user_uat_ioapp_v1.name
  operation_id        = "createWalletAttestation"
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  api_management_name = data.azurerm_api_management.platform_api_gateway.name

  xml_content = file("${path.module}/policies/inject_fiscal_code_into_body.xml")
}

resource "azurerm_api_management_api_operation_policy" "create_wallet_instance_uat_policy" {
  api_name            = azurerm_api_management_api.wallet_user_uat_ioapp_v1.name
  operation_id        = "createWalletInstance"
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  api_management_name = data.azurerm_api_management.platform_api_gateway.name

  xml_content = file("${path.module}/policies/inject_fiscal_code_into_body.xml")
}

resource "azurerm_api_management_api_operation_policy" "set_wallet_instance_status_uat_policy" {
  api_name            = azurerm_api_management_api.wallet_user_uat_ioapp_v1.name
  operation_id        = "setWalletInstanceStatus"
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  api_management_name = data.azurerm_api_management.platform_api_gateway.name

  xml_content = file("${path.module}/policies/inject_fiscal_code_into_body.xml")
}

resource "azurerm_api_management_api_operation_policy" "get_wallet_instance_status_uat_policy" {
  api_name            = azurerm_api_management_api.wallet_user_uat_ioapp_v1.name
  operation_id        = "getWalletInstanceStatus"
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  api_management_name = data.azurerm_api_management.platform_api_gateway.name

  xml_content = file("${path.module}/policies/set_fiscal_code_from_header.xml")
}

resource "azurerm_api_management_api_operation_policy" "get_current_wallet_instance_status_uat_policy" {
  api_name            = azurerm_api_management_api.wallet_user_uat_ioapp_v1.name
  operation_id        = "getCurrentWalletInstanceStatus"
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  api_management_name = data.azurerm_api_management.platform_api_gateway.name

  xml_content = file("${path.module}/policies/set_fiscal_code_from_header.xml")
}