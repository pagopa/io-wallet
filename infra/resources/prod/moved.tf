moved {
  from = module.cdn.azurerm_dns_txt_record.wallet_io_pagopa_it
  to   = module.dns.azurerm_dns_txt_record.wallet_io_pagopa_it
}

moved {
  from = module.cdn.azurerm_dns_a_record.this
  to   = module.dns.azurerm_dns_a_record.this
}