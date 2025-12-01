# module "storage_accounts" {
#   source = "../../_modules/storage_accounts"

#   prefix          = local.environment.prefix
#   env_short       = local.environment.env_short
#   u_env_short     = local.u_env_short
#   location        = local.environment.location
#   domain          = "wallet"
#   app_name        = "st"
#   instance_number = "01"

#   resource_group_name = data.azurerm_resource_group.wallet.name

#   subnet_pep_id                        = data.azurerm_subnet.pep.id
#   private_dns_zone_resource_group_name = data.azurerm_resource_group.weu_common.name
#   action_group_id                      = module.monitoring.action_group_wallet.id

#   key_vault_wallet_id = module.key_vaults.key_vault_wallet.id

#   action_group_wallet_id = module.monitoring.action_group_wallet.id

#   tags = local.tags
# }
