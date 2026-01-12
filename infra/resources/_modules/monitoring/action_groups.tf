resource "azurerm_monitor_action_group" "wallet" {
  name                = "${var.project}-ag-01"
  resource_group_name = var.resource_group_name
  short_name          = var.display_name

  enabled = true

  email_receiver {
    name                    = "email"
    email_address           = var.notification_email
    use_common_alert_schema = true
  }

  email_receiver {
    name                    = "slack"
    email_address           = var.notification_slack
    use_common_alert_schema = true
  }

  tags = var.tags
}
