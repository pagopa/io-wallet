moved {
  from = module.cosmos.azurerm_cosmosdb_sql_container.containers["leases-revoke-wallet-instance"]
  to   = azurerm_cosmosdb_sql_container.leases
}

moved {
  from = module.iam.azurerm_role_assignment.infra_cd_subscription_rbac_admin[0]
  to   = azurerm_role_assignment.infra_cd_subscription_rbac_admin
}

moved {
  from = module.iam.module.admins_roles["0f0aa158-b7ad-4cac-af02-82c3e4768ee6"].module.cosmos.azurerm_cosmosdb_sql_role_assignment.this["io-p-itn-wallet-cosno-02|db|*|writer"]
  to   = module.admins_roles["0f0aa158-b7ad-4cac-af02-82c3e4768ee6"].module.cosmos.azurerm_cosmosdb_sql_role_assignment.this["io-p-itn-wallet-cosno-02|db|*|writer"]
}

moved {
  from = module.iam.module.admins_roles["0f0aa158-b7ad-4cac-af02-82c3e4768ee6"].module.key_vault.azurerm_key_vault_access_policy.this["io-p-sec-rg|io-p-kv|owner||owner"]
  to   = module.admins_roles["0f0aa158-b7ad-4cac-af02-82c3e4768ee6"].module.key_vault.azurerm_key_vault_access_policy.this["io-p-sec-rg|io-p-kv|owner||owner"]
}

moved {
  from = module.iam.module.admins_roles["0f0aa158-b7ad-4cac-af02-82c3e4768ee6"].module.key_vault.azurerm_role_assignment.secrets["io-p-itn-wallet-rg-01|io-p-itn-wallet-kv-01|owner"]
  to   = module.admins_roles["0f0aa158-b7ad-4cac-af02-82c3e4768ee6"].module.key_vault.azurerm_role_assignment.secrets["io-p-itn-wallet-rg-01|io-p-itn-wallet-kv-01|owner"]
}

moved {
  from = module.iam.module.admins_roles["d38daf6e-4e65-46d2-a11a-6e016b29fcbc"].module.cosmos.azurerm_cosmosdb_sql_role_assignment.this["io-p-itn-wallet-cosno-02|db|*|writer"]
  to   = module.admins_roles["d38daf6e-4e65-46d2-a11a-6e016b29fcbc"].module.cosmos.azurerm_cosmosdb_sql_role_assignment.this["io-p-itn-wallet-cosno-02|db|*|writer"]
}

moved {
  from = module.iam.module.admins_roles["d38daf6e-4e65-46d2-a11a-6e016b29fcbc"].module.key_vault.azurerm_key_vault_access_policy.this["io-p-sec-rg|io-p-kv|owner||owner"]
  to   = module.admins_roles["d38daf6e-4e65-46d2-a11a-6e016b29fcbc"].module.key_vault.azurerm_key_vault_access_policy.this["io-p-sec-rg|io-p-kv|owner||owner"]
}

moved {
  from = module.iam.module.admins_roles["d38daf6e-4e65-46d2-a11a-6e016b29fcbc"].module.key_vault.azurerm_role_assignment.secrets["io-p-itn-wallet-rg-01|io-p-itn-wallet-kv-01|owner"]
  to   = module.admins_roles["d38daf6e-4e65-46d2-a11a-6e016b29fcbc"].module.key_vault.azurerm_role_assignment.secrets["io-p-itn-wallet-rg-01|io-p-itn-wallet-kv-01|owner"]
}

moved {
  from = module.iam.module.key_vault_certificate_infra_cd.module.key_vault.azurerm_key_vault_access_policy.this["io-p-sec-rg|io-p-kv|reader||reader"]
  to   = module.key_vault_certificate_infra_cd.module.key_vault.azurerm_key_vault_access_policy.this["io-p-sec-rg|io-p-kv|reader||reader"]
}

moved {
  from = module.iam.module.key_vault_certificate_infra_ci.module.key_vault.azurerm_key_vault_access_policy.this["io-p-sec-rg|io-p-kv|reader||reader"]
  to   = module.key_vault_certificate_infra_ci.module.key_vault.azurerm_key_vault_access_policy.this["io-p-sec-rg|io-p-kv|reader||reader"]
}

# temp

resource "azurerm_cosmosdb_sql_container" "leases" {
  account_name  = "io-p-itn-wallet-cosno-02"
  database_name = "db"
  name          = "leases-revoke-wallet-instance"
  partition_key_paths = [
    "/id",
  ]
  resource_group_name = "io-p-itn-wallet-rg-01"
  autoscale_settings {
    max_throughput = 1000
  }
}
