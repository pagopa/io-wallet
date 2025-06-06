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

variable "tenant_id" {
  type        = string
  description = "Tenant Id"
}

variable "key_vault_certificates" {
  type = object({
    id                  = string
    name                = string
    resource_group_name = string
  })
}

variable "cdn_principal_id" {
  type = string
}

variable "ci_infra_principal_id" {
  type        = string
  description = "Principal ID of CICD infra pipelines"
}

variable "subscription_id" {
  type = string
}
