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

## APIM Backup and Restore

The `iw-p-itn-apps-apim-01` service is backed up every Sunday by the
`APIM Backup` GitHub Actions workflow. Backups are stored in the private
`apim-backups` container and deleted after 28 days.

Azure guarantees that an APIM backup can be restored only within 30 days of
its creation. Run the workflow manually after significant APIM configuration
changes when the weekly recovery point is not sufficient.

### Restore procedure

Restoring APIM overwrites service configuration and runtime state. Do not run a
restore while APIs, policies, products, users, custom domains, scaling, or
networking are being changed.

Before proceeding:

1. Verify that the backup is less than 30 days old.
2. Verify that the target APIM pricing tier matches the source tier.
3. Confirm that Terraform and Key Vault can recreate settings excluded from the
   backup, including custom TLS and CA certificates, VNet integration, managed
   identities, diagnostics, protocols and ciphers, and developer portal content.
4. Obtain explicit approval for the production restore.

Run the `APIM Restore` GitHub Actions workflow manually. Provide the exact
`.apimbackup` blob name and type `RESTORE iw-p-itn-apps-apim-01` in the
confirmation field. The workflow uses the protected `infra-psn-prod-cd`
environment and cannot run concurrently with the backup workflow.

The restore is a long-running operation. Wait for the workflow to return
successfully, then reconcile the excluded infrastructure with Terraform and
perform the service smoke tests before reopening configuration changes.

See the
[official backup and restore documentation](https://learn.microsoft.com/azure/api-management/api-management-howto-disaster-recovery-backup-restore)
for the complete constraints.
