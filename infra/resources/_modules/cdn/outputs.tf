output "storage_account" {
  sensitive = true
  value     = {
    id                        = module.wallet_cdn.id
    primary_connection_string = module.wallet_cdn.storage_primary_connection_string
  }
}
