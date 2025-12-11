resource "azurerm_storage_account" "cdn" {
  name = provider::dx::resource_name(merge(
    local.environment,
    {
      name          = "cdn"
      resource_type = "storage_account"
    }
  ))
  resource_group_name = data.azurerm_resource_group.wallet.name
  location            = local.environment.location

  account_replication_type = "ZRS"
  account_tier             = "Standard"
  account_kind             = "StorageV2"

  https_traffic_only_enabled      = true
  allow_nested_items_to_be_public = true
  public_network_access_enabled   = true
  shared_access_key_enabled       = false
  min_tls_version                 = "TLS1_2"

  blob_properties {
    versioning_enabled = true
  }

  tags = local.tags
}

resource "azurerm_storage_account_static_website" "cdn" {
  storage_account_id = azurerm_storage_account.cdn.id
  index_document     = "index.html"
  error_404_document = "404.html"
}

resource "azurerm_storage_container" "well_known" {
  name                  = "well-known"
  storage_account_id    = azurerm_storage_account.cdn.id
  container_access_type = "container"
}

resource "azurerm_storage_container" "exchange" {
  name                  = "exchange"
  storage_account_id    = azurerm_storage_account.cdn.id
  container_access_type = "container"
}

resource "azurerm_storage_container" "hub_spid_login" {
  name                  = "hub-spid-login"
  storage_account_id    = azurerm_storage_account.cdn.id
  container_access_type = "container"
}

resource "azurerm_storage_container" "pdnd" {
  name                  = "pdnd"
  storage_account_id    = azurerm_storage_account.cdn.id
  container_access_type = "container"
}
