variable "tags" {
  type        = map(any)
  description = "Resource tags"
}

variable "wallet_dns_zone_name" {
  type        = string
  description = "DNS zone name for wallet"
}

variable "cdn_endpoint_id" {
  type        = string
  description = "ID of the CDN endpoint to expose via DNS"
}

variable "wallet_dns_zone_resource_group_name" {
  type        = string
  description = "Resource group name for wallet DNS zone"
}