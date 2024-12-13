locals {
  wallet_cosmosdb_containers = [
    # Each document represents a wallet instance
    # The userId partition key is the tokenized identifier of the user
    {
      name               = "wallet-instances"
      partition_key_path = "/userId"
      autoscale_settings = {
        max_throughput = 8000
      }
      default_ttl = null
    },
    # Each document represents a nonce
    {
      name               = "nonces"
      partition_key_path = "/id"
      autoscale_settings = {
        max_throughput = 4000
      }
      default_ttl = 300
    },
  ]

  # Temporary, see CES-535
  cosmos_02 = {
    id   = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-wallet-rg-01/providers/Microsoft.DocumentDB/databaseAccounts/io-p-itn-wallet-cosno-02"
    name = "io-p-itn-wallet-cosno-02"
  }
}
