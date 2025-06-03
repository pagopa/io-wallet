variable "project" {
  type        = string
  description = "IO prefix and short environment"
}

variable "location" {
  type        = string
  description = "Azure region"
}

variable "tags" {
  type        = map(any)
  description = "Resource tags"
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where resources will be created"
}

variable "log_analytics_workspace_id" {
  type        = string
  description = "Log Analytics Workspace id"
}

variable "action_group_wallet_id" {
  type        = string
  description = "Id of the Action Group owned by the Wallet team"
}

variable "action_group_io_id" {
  type        = string
  description = "Id of the Action Group shared among all IO teams"
}

# variable "key_vault_cerificates_secret_id" {
#   type        = string
#   description = "TDB" // TODO
# }
