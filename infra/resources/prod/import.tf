import {
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-wallet-rg-01/providers/Microsoft.Storage/storageAccounts/iopitnwalletcdnst01"
  to = module.cdn.azurerm_storage_account_static_website.cdn_website
}

import {
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-wallet-rg-01/providers/Microsoft.DocumentDB/databaseAccounts/io-p-itn-wallet-cosno-02"
  to = module.cosmos.azurerm_cosmosdb_account.wallet_02
}
