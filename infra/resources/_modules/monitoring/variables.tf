variable "project" {
  type        = string
  description = "IO prefix and short environment"
}

variable "display_name" {
  type        = string
  description = "Display name for the action group"
}

variable "tags" {
  type        = map(any)
  description = "Resource tags"
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where resources will be created"
}

variable "notification_email" {
  type        = string
  description = "Email to use for the action group"
}

variable "notification_slack" {
  type    = string
  default = "Slack channel id to use for the action group"
}
