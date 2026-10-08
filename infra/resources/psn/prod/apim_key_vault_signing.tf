resource "azurerm_role_assignment" "apim_key_vault_crypto_user" {
  for_each = module.key_vault_app

  scope                = each.value.key_vault_wallet.id
  role_definition_name = "Key Vault Crypto User"
  principal_id         = module.apim.principal_id
  description          = "Allow APIM to sign with keys in application Key Vault ${each.key}"
}

resource "azurerm_api_management_backend" "key_vault_app" {
  for_each = module.key_vault_app

  name                = "wallet-key-vault-${each.key}"
  description         = "Application Key Vault ${each.key} signing backend"
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  protocol            = "http"
  url                 = "https://${each.value.key_vault_wallet.name}.vault.azure.net"

  credentials {
    authorization {
      scheme    = "ManagedIdentity"
      parameter = "https://vault.azure.net"
    }
  }
}

resource "azapi_resource" "apim_key_vault_signing_pool" {
  type      = "Microsoft.ApiManagement/service/backends@2024-05-01"
  name      = "wallet-key-vault-signing-pool"
  parent_id = module.apim.id

  body = {
    properties = {
      description = "Round-robin pool of application Key Vault signing backends"
      type        = "Pool"
      pool = {
        services = [
          for backend in values(azurerm_api_management_backend.key_vault_app) : {
            id = backend.id
          }
        ]
      }
    }
  }
}

resource "azurerm_api_management_named_value" "wallet_provider_leaf_signing_key_vault_uri" {
  name                = "wallet-provider-leaf-signing-key-vault-uri"
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  display_name        = "WalletProviderLeafSigningKeyVaultUri"
  value               = "https://${module.key_vault_app["01"].key_vault_wallet.name}.vault.azure.net"
}

resource "azurerm_api_management_api_version_set" "user_jwt_signing" {
  name                = "wallet-user-jwt-signing-apis"
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name
  display_name        = "Wallet User - JWT Signing"
  versioning_scheme   = "Segment"
}

resource "azurerm_api_management_api" "user_jwt_signing_v1" {
  name                  = "user-jwt-signing-api-v1"
  api_management_name   = module.apim.name
  resource_group_name   = module.apim.resource_group_name
  subscription_required = false

  version_set_id = azurerm_api_management_api_version_set.user_jwt_signing.id
  version        = "v1"
  revision       = 1

  description  = "Signs JWT digests using a key in the application Key Vault pool"
  display_name = "IT-Wallet User - JWT Signing v1"
  path         = "api/wallet/signing"
  protocols    = ["https"]

  import {
    content_format = "openapi"
    content_value  = file("${path.module}/apim/api/key-vault-signing/swagger.yaml")
  }
}

resource "azurerm_api_management_api_operation_policy" "user_jwt_signing" {
  api_name            = azurerm_api_management_api.user_jwt_signing_v1.name
  operation_id        = "sign-digest"
  api_management_name = module.apim.name
  resource_group_name = module.apim.resource_group_name

  xml_content = file("${path.module}/apim/api/key-vault-signing/sign_jwt_policy.xml")

  depends_on = [
    azapi_resource.apim_key_vault_signing_pool,
    azurerm_api_management_named_value.wallet_provider_leaf_signing_key_vault_uri,
  ]
}
