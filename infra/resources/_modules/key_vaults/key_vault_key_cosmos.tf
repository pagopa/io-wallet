# tfsec:ignore:azure-keyvault-ensure-key-expiry
resource "azurerm_key_vault_key" "cosmos" {
  name         = "${var.project}-wallet-cosno-key-01"
  key_vault_id = azurerm_key_vault.wallet.id
  key_type     = "RSA"
  key_size     = 3072

  key_opts = [
    "encrypt",
    "decrypt",
    "sign",
    "verify",
    "wrapKey",
    "unwrapKey",
  ]

  rotation_policy {
    automatic {
      time_before_expiry = "P6M"
    }

    expire_after         = "P2Y"
    notify_before_expiry = "P30D"
  }

  tags = var.tags
}
