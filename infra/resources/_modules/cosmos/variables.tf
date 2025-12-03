variable "environment" {
  type = object({
    prefix          = string
    environment     = string
    location        = string
    name            = string
    instance_number = string
  })
}

variable "secondary_location" {
  type    = string
  default = null
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

variable "action_group_ids" {
  type        = set(string)
  description = "Set of action group to use for alerts"
}

variable "user_assigned_managed_identity_id" {
  type        = string
  description = "Id of the user-assigned managed identity federated with PSN"
}

variable "psn_service_principal_id" {
  type        = string
  description = "Id of the service principal federated with PSN"
  default     = null
}
