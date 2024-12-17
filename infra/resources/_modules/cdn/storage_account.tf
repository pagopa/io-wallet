resource "azurerm_storage_account" "this" {
  name                            = "${replace(var.project, "-", "")}walletcdnst01"
  resource_group_name             = var.resource_group_name
  location                        = var.location
  account_tier                    = "Standard"
  account_kind                    = "StorageV2"
  account_replication_type        = "ZRS"
  https_traffic_only_enabled      = true
  allow_nested_items_to_be_public = true
  public_network_access_enabled   = true
  shared_access_key_enabled       = false
  min_tls_version                 = "TLS1_2"

  blob_properties {
    versioning_enabled = true
  }

  tags = var.tags
}

resource "azurerm_storage_account_static_website" "cdn_website" {
  storage_account_id = azurerm_storage_account.this.id
  index_document     = "index.html"
  error_404_document = "404.html"
}

resource "azurerm_storage_container" "well_known" {
  name                 = "well-known"
  storage_account_name = azurerm_storage_account.this.name

  # tfsec:ignore:azure-storage-no-public-access
  container_access_type = "container"
}

resource "azurerm_storage_container" "exchange" {
  name                 = "exchange"
  storage_account_name = azurerm_storage_account.this.name

  # tfsec:ignore:azure-storage-no-public-access
  container_access_type = "container"
}

resource "azurerm_storage_container" "hub-spid-login" {
  name                 = "hub-spid-login"
  storage_account_name = azurerm_storage_account.this.name

  # tfsec:ignore:azure-storage-no-public-access
  container_access_type = "container"
}

resource "azurerm_storage_container" "pdnd" {
  name                 = "pdnd"
  storage_account_name = azurerm_storage_account.this.name

  # tfsec:ignore:azure-storage-no-public-access
  container_access_type = "container"
}
