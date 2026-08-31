locals {
  apim_backup_container_name = "apim-backups"
}

# The storage account is used to store the APIM backups. The storage account is
# created in the same resource group as the APIM instance, but it is not linked
# to the APIM instance. The storage account is created with a private endpoint,
# so it can only be accessed from the VNET where the APIM instance is deployed.
module "apim_backup_storage_account" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 3.0"

  environment = {
    prefix          = local.environment.prefix
    env_short       = local.environment.environment
    location        = local.environment.location
    app_name        = "apim-backup"
    instance_number = local.environment.instance_number
  }

  resource_group_name = data.azurerm_resource_group.wallet.name
  use_case            = "default"
  access_tier         = "Hot"

  force_public_network_access_enabled = true

  network_rules = {
    default_action             = "Deny"
    bypass                     = ["AzureServices"]
    ip_rules                   = []
    virtual_network_subnet_ids = []
  }

  blob_features = {
    delete_retention_days = 7
  }

  containers = [
    {
      name        = local.apim_backup_container_name
      access_type = "private"
    }
  ]

  action_group_id = module.monitoring.action_group_wallet.id

  tags = local.tags
}

# The storage module cannot resolve a Private DNS zone hosted in the hub
# subscription with a separate provider, so the endpoint is wired here.
resource "azurerm_private_endpoint" "apim_backup_blob" {
  name                = provider::dx::resource_name(merge(local.environment, { name = "apim-backup", resource_type = "blob_private_endpoint" }))
  location            = local.environment.location
  resource_group_name = data.azurerm_resource_group.wallet.name
  subnet_id           = data.azurerm_subnet.pep.id

  private_service_connection {
    name                           = provider::dx::resource_name(merge(local.environment, { name = "apim-backup", resource_type = "blob_private_endpoint" }))
    private_connection_resource_id = module.apim_backup_storage_account.id
    is_manual_connection           = false
    subresource_names              = ["blob"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.blob.id]
  }

  tags = local.tags
}

# All the backups older than 28 days will be deleted automatically
# by the storage account management policy.
resource "azurerm_storage_management_policy" "apim_backup_policy" {
  storage_account_id = module.apim_backup_storage_account.id

  rule {
    name    = "delete-expired-apim-backups"
    enabled = true

    filters {
      prefix_match = ["${local.apim_backup_container_name}/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        delete_after_days_since_modification_greater_than = 28
      }
    }
  }
}
