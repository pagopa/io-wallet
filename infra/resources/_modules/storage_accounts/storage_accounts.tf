locals {
  storage_account_name = provider::dx::resource_name(merge(
    var.environment,
    {
      resource_type = "storage_account"
    }
  ))
  uat_storage_account_name = provider::dx::resource_name(merge(
    var.environment,
    {
      environment   = var.u_env_short
      resource_type = "storage_account"
    }
  ))
}

resource "azurerm_storage_account" "common" {
  name                = local.storage_account_name
  resource_group_name = var.resource_group_name
  location            = var.environment.location

  identity {
    type         = var.user_assigned_managed_identity_id == null ? "SystemAssigned" : "UserAssigned"
    identity_ids = var.user_assigned_managed_identity_id == null ? null : [var.user_assigned_managed_identity_id]
  }

  account_kind             = "StorageV2"
  account_tier             = "Standard"
  account_replication_type = "ZRS"

  public_network_access_enabled   = false
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = var.user_assigned_managed_identity_id == null
  default_to_oauth_authentication = var.user_assigned_managed_identity_id != null

  dynamic "customer_managed_key" {
    for_each = var.customer_managed_key_url == null || var.user_assigned_managed_identity_id == null ? [] : [1]

    content {
      managed_hsm_key_id        = var.customer_managed_key_url
      user_assigned_identity_id = var.user_assigned_managed_identity_id
    }
  }

  tags = var.tags
}

resource "azurerm_storage_account" "common_uat" {
  name                = local.uat_storage_account_name
  resource_group_name = var.resource_group_name
  location            = var.environment.location

  identity {
    type         = var.user_assigned_managed_identity_id == null ? "SystemAssigned" : "UserAssigned"
    identity_ids = var.user_assigned_managed_identity_id == null ? null : [var.user_assigned_managed_identity_id]
  }

  account_kind             = "StorageV2"
  account_tier             = "Standard"
  account_replication_type = "LRS"

  public_network_access_enabled   = false
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = var.user_assigned_managed_identity_id == null
  default_to_oauth_authentication = var.user_assigned_managed_identity_id != null

  dynamic "customer_managed_key" {
    for_each = var.customer_managed_key_url == null || var.user_assigned_managed_identity_id == null ? [] : [1]

    content {
      managed_hsm_key_id        = var.customer_managed_key_url
      user_assigned_identity_id = var.user_assigned_managed_identity_id
    }
  }

  tags = var.tags
}
