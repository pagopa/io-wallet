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
    {
      name               = "leases-revoke-wallet-instance"
      partition_key_path = "/id"
      autoscale_settings = {
        max_throughput = 1000
      }
      default_ttl = null
    }
  ]
}
