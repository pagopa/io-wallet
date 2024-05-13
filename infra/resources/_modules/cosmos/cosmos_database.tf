module "cosmos_database_wallet" {
  source = "github.com/pagopa/terraform-azurerm-v3//cosmosdb_sql_database?ref=v8.12.2"

  name                = "db"
  resource_group_name = var.resource_group_name

  account_name = module.cosmos_account_wallet.name
}
