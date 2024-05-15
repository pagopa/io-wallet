module "functions" {
  source = "../_modules/functions_apps"

  project             = local.project
  project_legacy      = local.project_legacy
  location            = local.location
  resource_group_name = module.resource_groups.resource_group_wallet.name

  subnet_id                   = module.networking.subnet_wallet.id
  subnet_private_endpoints_id = module.networking.subnet_pendpoints.id

  tags = local.tags

  cosmos_db = {
    endpoint    = module.cosmos.cosmos_account_wallet_endpoint
    name        = module.cosmos.cosmos_account_wallet.name
  }
}

# 
# Managed Identities
# 
# see https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
# for role definitions
# 

# Allow the Function App to access the Storage Account
# to write the signed entity configuration to the blob storage
resource "azurerm_role_assignment" "function_to_storage" {
  scope                 = module.cdn.storage_account.id
  role_definition_name  = "Contributor"
  principal_id          = module.functions.function_app_wallet.id
}

# Allow the Function App to access the Key Vault
resource "azurerm_role_assignment" "function_to_keyvault" {
  scope                 = module.keyvault.id
  role_definition_name  = "Reader"
  principal_id          = module.functions.function_app_wallet.id
}

# Allow the Function App to access the Cosmos DB
resource "azurerm_role_assignment" "function_to_cosmosdb" {
  scope                = module.cosmos.cosmos_account_wallet.id
  role_definition_name = "DocumentDB Account Contributor"
  principal_id         = module.functions.function_app_wallet.id
}
