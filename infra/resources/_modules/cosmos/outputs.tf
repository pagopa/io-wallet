output "cosmos_account_wallet" {
  value = {
    id                  = module.cosmos_account_wallet.id
    name                = module.cosmos_account_wallet.name
    resource_group_name = var.resource_group_name
  }
}

output "cosmos_account_wallet_endpoint" {
  value     = module.cosmos_account_wallet.endpoint
  sensitive = true
}

output "cosmos_account_wallet_primary_key" {
  value     = module.cosmos_account_wallet.primary_key
  sensitive = true
}
