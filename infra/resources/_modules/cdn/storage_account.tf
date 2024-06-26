resource "azurerm_storage_account" "this" {
  name                            = "${replace(var.project, "-", "")}walletcdnst01"
  resource_group_name             = var.resource_group_name
  location                        = var.location
  account_tier                    = "Standard"
  account_kind                    = "StorageV2"
  account_replication_type        = "ZRS"
  enable_https_traffic_only       = true
  allow_nested_items_to_be_public = true
  public_network_access_enabled   = true
  shared_access_key_enabled       = false
  min_tls_version                 = "TLS1_2"

  blob_properties {
    versioning_enabled = true
  }

  static_website {
    index_document     = "index.html"
    error_404_document = "404.html"
  }

  tags = var.tags
}

resource "azurerm_storage_container" "well_known" {
  name                 = "well-known"
  storage_account_name = azurerm_storage_account.this.name

  # tfsec:ignore:azure-storage-no-public-access
  container_access_type = "container"
}
