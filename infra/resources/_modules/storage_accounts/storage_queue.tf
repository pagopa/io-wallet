resource "azurerm_storage_queue" "wallet_instances_revocation_check" {
  name                 = "wallet-instances-revocation-check"
  storage_account_name = module.storage_account.name
}

resource "azurerm_storage_queue" "wallet_instances_revocation_check_02" {
  name                 = "wallet-instances-revocation-check-02"
  storage_account_name = module.storage_account.name
}

resource "azurerm_storage_queue" "wallet-instance-creation-email-queue-01" {
  name                 = "wallet-instance-creation-email-queue-01"
  storage_account_name = module.storage_account.name
}

resource "azurerm_storage_queue" "wallet-instance-revocation-email-queue-01" {
  name                 = "wallet-instance-revocation-email-queue-01"
  storage_account_name = module.storage_account.name
}

resource "azurerm_storage_queue" "wallet-instance-creation-email-queue-uat" {
  name                 = "wallet-instance-creation-email-queue-01"
  storage_account_name = module.storage_account_uat.name
}

resource "azurerm_storage_queue" "wallet-instance-revocation-email-queue-uat" {
  name                 = "wallet-instance-revocation-email-queue-01"
  storage_account_name = module.storage_account_uat.name
}

resource "azurerm_monitor_metric_alert" "poison_queue_creation_email" {
  name                = "[${azurerm_storage_queue.wallet-instance-creation-email-queue-01.name}] Poison Queue Alert"
  resource_group_name = var.resource_group_name
  scopes              = [module.storage_account.id]
  description         = "Poison queue for wallet creation emails exceeds threshold"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Storage/storageAccounts/queues"
    metric_name      = "ApproximateMessagesCount"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 10

    dimension {
      name     = "QueueName"
      operator = "Include"
      values   = ["${azurerm_storage_queue.wallet-instance-creation-email-queue-01.name}-poison"]
    }
  }

  action {
    action_group_id = var.action_group_wallet_id
  }

  tags = var.tags
}

resource "azurerm_monitor_metric_alert" "poison_queue_revocation_email" {
  name                = "[${azurerm_storage_queue.wallet-instance-revocation-email-queue-01.name}] Poison Queue Alert"
  resource_group_name = var.resource_group_name
  scopes              = [module.storage_account.id]
  description         = "Poison queue for wallet revocation emails exceeds threshold"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Storage/storageAccounts/queues"
    metric_name      = "ApproximateMessagesCount"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 10

    dimension {
      name     = "QueueName"
      operator = "Include"
      values   = ["${azurerm_storage_queue.wallet-instance-revocation-email-queue-01.name}-poison"]
    }
  }

  action {
    action_group_id = var.action_group_wallet_id
  }

  tags = var.tags
}
