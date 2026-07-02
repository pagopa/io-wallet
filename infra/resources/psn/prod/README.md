# IO Wallet - Resources

## Networking Restrictions to be Aware Of

### APIM

Deploying APIM the Spoke network could be challenging. In fact, due to network restrictions, APIM needs to reach some external endpoints and Azure services to work properly. Therefore, traffic from APIM's subnet should be allowed by the firewall to:

internet:

- \*.digicert.com
- ntp1.dell.com
- ntp2.dell.com
- ntp.dell.com

Azure services (via service tags):

- KeyVault
- Storage
- Sql

Moreover, to receive connections from the Hub (e.g. Application Gateway), another firewall rule must be set:

- source: source subnet (e.g. Application Gateway subnet CIDR)
- target: `<apim-custom-domain>` (e.g. apim.internal.wallet.io.pagopa.it)
- protocol: `Https:443`
