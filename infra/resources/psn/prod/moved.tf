moved {
  from = module.function_apps.module.function_app_user_autoscaler_02.azurerm_monitor_autoscale_setting.this
  to   = module.function_apps.module.function_app_user_autoscaler_02["01"].azurerm_monitor_autoscale_setting.this
}

moved {
  from = module.iam.module.func_app_user.module.cosmos.azurerm_cosmosdb_sql_role_assignment.this["iw-p-itn-apps-cosno-01|db|*|writer"]
  to   = module.iam.module.func_app_user["01"].module.cosmos.azurerm_cosmosdb_sql_role_assignment.this["iw-p-itn-apps-cosno-01|db|*|writer"]
}

moved {
  from = module.iam.module.func_app_user.module.key_vault.azurerm_role_assignment.secrets["iw-p-itn-wallet-rg-01|iw-p-itn-apps-kv-01|reader"]
  to   = module.iam.module.func_app_user["01"].module.key_vault.azurerm_role_assignment.secrets["iw-p-itn-wallet-rg-01|iw-p-itn-apps-kv-01|reader"]
}

moved {
  from = module.iam.module.func_app_user.module.storage_account.azurerm_role_assignment.blob["iwpitnappsst01|*|writer|PagoPA Storage Blob Tags Contributor"]
  to   = module.iam.module.func_app_user["01"].module.storage_account.azurerm_role_assignment.blob["iwpitnappsst01|*|writer|PagoPA Storage Blob Tags Contributor"]
}

moved {
  from = module.iam.module.func_app_user.module.storage_account.azurerm_role_assignment.blob["iwpitnappsst01|*|writer|Storage Blob Data Contributor"]
  to   = module.iam.module.func_app_user["01"].module.storage_account.azurerm_role_assignment.blob["iwpitnappsst01|*|writer|Storage Blob Data Contributor"]
}

moved {
  from = module.iam.module.func_app_user.module.storage_account.azurerm_role_assignment.blob["iwpitncdnst01|*|writer|PagoPA Storage Blob Tags Contributor"]
  to   = module.iam.module.func_app_user["01"].module.storage_account.azurerm_role_assignment.blob["iwpitncdnst01|*|writer|PagoPA Storage Blob Tags Contributor"]
}

moved {
  from = module.iam.module.func_app_user.module.storage_account.azurerm_role_assignment.blob["iwpitncdnst01|*|writer|Storage Blob Data Contributor"]
  to   = module.iam.module.func_app_user["01"].module.storage_account.azurerm_role_assignment.blob["iwpitncdnst01|*|writer|Storage Blob Data Contributor"]
}

moved {
  from = module.iam.module.func_app_user.module.storage_account.azurerm_role_assignment.queue["iwpitnappsst01|*|owner|Storage Queue Data Contributor"]
  to   = module.iam.module.func_app_user["01"].module.storage_account.azurerm_role_assignment.queue["iwpitnappsst01|*|owner|Storage Queue Data Contributor"]
}

moved {
  from = module.iam.module.func_app_user.module.storage_account.azurerm_role_assignment.queue["iwpitnappsst01|*|reader|PagoPA Storage Queue Data Message Contributor"]
  to   = module.iam.module.func_app_user["01"].module.storage_account.azurerm_role_assignment.queue["iwpitnappsst01|*|reader|PagoPA Storage Queue Data Message Contributor"]
}

moved {
  from = module.iam.module.func_app_user.module.storage_account.azurerm_role_assignment.queue["iwpitnappsst01|*|reader|Storage Queue Data Message Processor"]
  to   = module.iam.module.func_app_user["01"].module.storage_account.azurerm_role_assignment.queue["iwpitnappsst01|*|reader|Storage Queue Data Message Processor"]
}

moved {
  from = module.iam.module.func_app_user.module.storage_account.azurerm_role_assignment.queue["iwpitnappsst01|*|reader|Storage Queue Data Reader"]
  to   = module.iam.module.func_app_user["01"].module.storage_account.azurerm_role_assignment.queue["iwpitnappsst01|*|reader|Storage Queue Data Reader"]
}

moved {
  from = module.iam.module.func_app_user.module.storage_account.azurerm_role_assignment.queue["iwpitnappsst01|*|writer|Storage Queue Data Message Sender"]
  to   = module.iam.module.func_app_user["01"].module.storage_account.azurerm_role_assignment.queue["iwpitnappsst01|*|writer|Storage Queue Data Message Sender"]
}

moved {
  from = module.iam.module.func_app_user_slot[0].module.cosmos.azurerm_cosmosdb_sql_role_assignment.this["iw-p-itn-apps-cosno-01|db|*|writer"]
  to   = module.iam.module.func_app_user_slot["01"].module.cosmos.azurerm_cosmosdb_sql_role_assignment.this["iw-p-itn-apps-cosno-01|db|*|writer"]
}

moved {
  from = module.iam.module.func_app_user_slot[0].module.key_vault.azurerm_role_assignment.secrets["iw-p-itn-wallet-rg-01|iw-p-itn-apps-kv-01|reader"]
  to   = module.iam.module.func_app_user_slot["01"].module.key_vault.azurerm_role_assignment.secrets["iw-p-itn-wallet-rg-01|iw-p-itn-apps-kv-01|reader"]
}

moved {
  from = module.iam.module.func_app_user_slot[0].module.storage_account.azurerm_role_assignment.blob["iwpitnappsst01|*|writer|PagoPA Storage Blob Tags Contributor"]
  to   = module.iam.module.func_app_user_slot["01"].module.storage_account.azurerm_role_assignment.blob["iwpitnappsst01|*|writer|PagoPA Storage Blob Tags Contributor"]
}

moved {
  from = module.iam.module.func_app_user_slot[0].module.storage_account.azurerm_role_assignment.blob["iwpitnappsst01|*|writer|Storage Blob Data Contributor"]
  to   = module.iam.module.func_app_user_slot["01"].module.storage_account.azurerm_role_assignment.blob["iwpitnappsst01|*|writer|Storage Blob Data Contributor"]
}

moved {
  from = module.iam.module.func_app_user_slot[0].module.storage_account.azurerm_role_assignment.blob["iwpitncdnst01|*|writer|PagoPA Storage Blob Tags Contributor"]
  to   = module.iam.module.func_app_user_slot["01"].module.storage_account.azurerm_role_assignment.blob["iwpitncdnst01|*|writer|PagoPA Storage Blob Tags Contributor"]
}

moved {
  from = module.iam.module.func_app_user_slot[0].module.storage_account.azurerm_role_assignment.blob["iwpitncdnst01|*|writer|Storage Blob Data Contributor"]
  to   = module.iam.module.func_app_user_slot["01"].module.storage_account.azurerm_role_assignment.blob["iwpitncdnst01|*|writer|Storage Blob Data Contributor"]
}

moved {
  from = module.iam.module.func_app_user_slot[0].module.storage_account.azurerm_role_assignment.queue["iwpitnappsst01|*|owner|Storage Queue Data Contributor"]
  to   = module.iam.module.func_app_user_slot["01"].module.storage_account.azurerm_role_assignment.queue["iwpitnappsst01|*|owner|Storage Queue Data Contributor"]
}

moved {
  from = module.iam.module.func_app_user_slot[0].module.storage_account.azurerm_role_assignment.queue["iwpitnappsst01|*|reader|PagoPA Storage Queue Data Message Contributor"]
  to   = module.iam.module.func_app_user_slot["01"].module.storage_account.azurerm_role_assignment.queue["iwpitnappsst01|*|reader|PagoPA Storage Queue Data Message Contributor"]
}

moved {
  from = module.iam.module.func_app_user_slot[0].module.storage_account.azurerm_role_assignment.queue["iwpitnappsst01|*|reader|Storage Queue Data Message Processor"]
  to   = module.iam.module.func_app_user_slot["01"].module.storage_account.azurerm_role_assignment.queue["iwpitnappsst01|*|reader|Storage Queue Data Message Processor"]
}

moved {
  from = module.iam.module.func_app_user_slot[0].module.storage_account.azurerm_role_assignment.queue["iwpitnappsst01|*|reader|Storage Queue Data Reader"]
  to   = module.iam.module.func_app_user_slot["01"].module.storage_account.azurerm_role_assignment.queue["iwpitnappsst01|*|reader|Storage Queue Data Reader"]
}

moved {
  from = module.iam.module.func_app_user_slot[0].module.storage_account.azurerm_role_assignment.queue["iwpitnappsst01|*|writer|Storage Queue Data Message Sender"]
  to   = module.iam.module.func_app_user_slot["01"].module.storage_account.azurerm_role_assignment.queue["iwpitnappsst01|*|writer|Storage Queue Data Message Sender"]
}
