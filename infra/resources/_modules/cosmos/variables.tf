variable "project" {
  type        = string
  description = "IO prefix and short environment"
}

variable "location" {
  type        = string
  description = "Azure region"
}

variable "secondary_location" {
  type = string
}

variable "tags" {
  type        = map(any)
  description = "Resource tags"
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where resources will be created"
}

variable "private_endpoint_subnet_id" {
  type = string
}

variable "private_link_documents_id" {
  type = string
}

variable "action_group_wallet_id" {
  type        = string
  description = "Id of the Action Group owned by the Wallet team"
}

variable "action_group_io_id" {
  type        = string
  description = "Id of the Action Group shared among all IO teams"
}

variable "user_assigned_managed_identity_id" {
  type        = string
  description = ""
}
