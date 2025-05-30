locals {
  wallet_cosmosdb_containers = [
    # Each document represents a wallet instance
    # The userId partition key is the user fiscal code
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
      name               = "wallet-instances-user-id"
      partition_key_path = "/id"
      autoscale_settings = {
        max_throughput = 8000
      }
      default_ttl = null
    },
    {
      name               = "leases-revoke-wallet-instance"
      partition_key_path = "/id"
      autoscale_settings = {
        max_throughput = 1000
      }
      default_ttl = null
    },
    {
      name               = "leases-wallet-instances-user-id"
      partition_key_path = "/id"
      autoscale_settings = {
        max_throughput = 1000
      }
      default_ttl = null
    },
    {
      name               = "whitelisted-fiscal-codes"
      partition_key_path = "/id"
      autoscale_settings = {
        max_throughput = 8000
      }
      default_ttl = null
    },
  ]
}
