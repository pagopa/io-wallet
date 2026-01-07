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
  shared_access_key_enabled       = true
  default_to_oauth_authentication = true
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

resource "azurerm_storage_container" "probes" {
  name                  = "probes"
  storage_account_id    = azurerm_storage_account.cdn.id
  container_access_type = "container"
}

resource "azurerm_storage_container" "root" {
  name                  = "$root"
  storage_account_id    = azurerm_storage_account.cdn.id
  container_access_type = "container"
}

resource "azurerm_storage_blob" "healthcheck" {
  name                   = "healthcheck.txt"
  storage_account_name   = azurerm_storage_account.cdn.name
  storage_container_name = azurerm_storage_container.probes.name
  type                   = "Block"
  source_content         = "OK"
  content_type           = "text/plain"
}

resource "azurerm_storage_blob" "index" {
  name                   = "index.html"
  storage_account_name   = azurerm_storage_account.cdn.name
  storage_container_name = azurerm_storage_container.root.name
  type                   = "Block"
  source_content         = ""
  content_type           = "text/html"
}

module "cdn" {
  source  = "pagopa-dx/azure-cdn/azurerm"
  version = "~> 0.3"

  environment = merge(
    local.environment,
    {
      app_name  = "cdn",
      env_short = local.environment.environment
    }
  )

  resource_group_name = data.azurerm_resource_group.wallet.name

  origins = {
    primary = {
      host_name = azurerm_storage_account.cdn.primary_blob_host
    }
  }

  custom_domains = [
    {
      host_name = "wallet.io.pagopa.it"
    }
  ]

  tags = local.tags
}

resource "azurerm_cdn_frontdoor_rule" "well_known_rewrite" {
  name                      = "WellKnownRewrite"
  cdn_frontdoor_rule_set_id = module.cdn.rule_set_id
  order                     = 1
  behavior_on_match         = "Continue"

  conditions {
    url_path_condition {
      operator         = "BeginsWith"
      match_values     = [".well-known"]
      transforms       = []
      negate_condition = false
    }
  }

  actions {
    url_rewrite_action {
      source_pattern          = "/.well-known/"
      destination             = "/well-known/"
      preserve_unmatched_path = true
    }
  }
}
