locals {
  function_app_wallet = {
    app_settings = merge({
      FUNCTIONS_WORKER_RUNTIME       = "node"
      FUNCTIONS_WORKER_PROCESS_COUNT = 4
      NODE_ENV                       = "production"

      // Keepalive fields are all optionals
      FETCH_KEEPALIVE_ENABLED             = "true"
      FETCH_KEEPALIVE_SOCKET_ACTIVE_TTL   = "110000"
      FETCH_KEEPALIVE_MAX_SOCKETS         = "40"
      FETCH_KEEPALIVE_MAX_FREE_SOCKETS    = "10"
      FETCH_KEEPALIVE_FREE_SOCKET_TIMEOUT = "30000"
      FETCH_KEEPALIVE_TIMEOUT             = "60000"

      CosmosDbEndpoint     = var.cosmos_db_endpoint
      CosmosDbDatabaseName = var.cosmos_database_names[0]

      EntityConfigurationStorageAccount__serviceUri = "https://${var.storage_account_cdn_name}.blob.core.windows.net"
      EntityConfigurationStorageContainerName       = "well-known"

      FederationEntityBasePath         = "https://wallet.io.pagopa.it"
      FederationEntityOrganizationName = "PagoPa S.p.A."
      FederationEntityHomepageUri      = "https://io.italia.it"
      FederationEntityPolicyUri        = "https://io.italia.it/privacy-policy/"
      FederationEntityTosUri           = "https://io.italia.it/privacy-policy/"
      FederationEntityLogoUri          = "https://io.italia.it/assets/img/io-it-logo-blue.svg"
      IosBundleIdentifiers             = "it.pagopa.app.io,it.pagopa.app.io.poc.itwallet"
      IosTeamIdentifier                = "M2X5YQ4BJ7"
      AndroidBundleIdentifiers         = "it.pagopa.io.app,it.pagopa.app.io.poc.itwallet"
      AndroidCrlUrl                    = "https://android.googleapis.com/attestation/status"
      AndroidPlayIntegrityUrl          = "https://www.googleapis.com/auth/playintegrity"
      AndroidPlayStoreCertificateHash  = "feT-Pqrgg__NiwcDAehlAtPx6tHdZqwUK618VEdVT4I"
      AppleRootCertificate             = "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNJVENDQWFlZ0F3SUJBZ0lRQy9PK0R2SE4wdUQ3akc1eUgySVhtREFLQmdncWhrak9QUVFEQXpCU01TWXdKQVlEVlFRRERCMUJjSEJzWlNCQmNIQWdRWFIwWlhOMFlYUnBiMjRnVW05dmRDQkRRVEVUTUJFR0ExVUVDZ3dLUVhCd2JHVWdTVzVqTGpFVE1CRUdBMVVFQ0F3S1EyRnNhV1p2Y201cFlUQWVGdzB5TURBek1UZ3hPRE15TlROYUZ3MDBOVEF6TVRVd01EQXdNREJhTUZJeEpqQWtCZ05WQkFNTUhVRndjR3hsSUVGd2NDQkJkSFJsYzNSaGRHbHZiaUJTYjI5MElFTkJNUk13RVFZRFZRUUtEQXBCY0hCc1pTQkpibU11TVJNd0VRWURWUVFJREFwRFlXeHBabTl5Ym1saE1IWXdFQVlIS29aSXpqMENBUVlGSzRFRUFDSURZZ0FFUlRIaG1MVzA3QVRhRlFJRVZ3VHRUNGR5Y3RkaE5iSmhGcy9JaTJGZENnQUhHYnBwaFkzK2Q4cWp1RG5nSU4zV1ZoUVVCSEFvTWVRL2NMaVAxc09VdGdqcUs5YXVZZW4xbU1FdlJxOVNrM0ptNVg4VTYySCt4VEQzRkU5VGdTNDFvMEl3UURBUEJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJTc2tSQlRNNzIrYUVIL3B3eXA1ZnJxNWVXS29UQU9CZ05WSFE4QkFmOEVCQU1DQVFZd0NnWUlLb1pJemowRUF3TURhQUF3WlFJd1FnRkduQnl2c2lWYnBUS3dTZ2Ewa1AwZThFZURTNCtzUW1UdmI3dm41M081K0ZSWGdlTGhwSjA2eXNDNVByT3lBakVBcDVVNHhEZ0VnbGxGN0VuM1ZjRTNpZXhaWnRLZVlucHF0aWpWb3lGcmFXVkl5ZC9kZ2FubXJkdUMxYm1UQkd3RAotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0t"
      GooglePublicKey                  = "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQ0lqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FnOEFNSUlDQ2dLQ0FnRUFyN2JIZ2l1eHB3SHNLN1F1aTh4VQpGbU9yNzVndk1zZC9kVEVEREpkU1N4dGY2QW43eHlxcFJSOTBQTDJhYnhNMWRFcWxYbmYydHF3MU5lNFh3bDVqCmxSZmRuSkxtTjBwVHkvNGxqNC83dHYwU2szaWlLa3lwbkVVdFI2V2ZNZ0gwUVpmS0hNMStkaSt5OVRGUnR2NnkKLy8wcmIrVCtXOGE5bnNOTC9nZ2puYXI4NjQ2MXFPMHJPczJjWGpwM2tPRzFGRUo1TVZtRm1CR3RucktwYTczWApwWHlUcVJ4Qi9NMG4xbi9XOW5HcUM0RlNZYTA0VDZONVJJWkdCTjJ6Mk1UNUlLR2JGbGJDOFVyVzBEeFc3QVlJCm1RUWNIdEdsL20wMFFMVld1dEhRb1ZKWW5GUGxYVGNIWXZBU0x1K1JoaHNiRG14TWdKSjBtY0RwdnNDNFBqdkIKK1R4eXdFbGdTNzB2RTBYbUxEK09KdHZzQnNsSFp2UEJLQ09kVDBNUyt0Z1NPSWZnYSt6MVoxZzcrRFZhZ2Y3cQp1dm1hZzhqZlBpb3lLdnhuSy9FZ3NUVVZpMmdoenE4d20yN3VkL21JTTdBWTJxRU9SUjhHbzNUVkI0SHpXUWdwClpydDNpNU1JbENhWTUwNEx6U1JpaWdIQ3pBUGxId3MrVzByQjVOK2VyNS8ycEpLbmZCU0RpQ2lGQVZ0Q0xPWjcKZ0xpTW0wamhPMkI2dFVYSEkvK01SUGp5MDJpNTlsSU5NUlJldjU2R0t0Y2Q5cU8vMGtVSldkWlRkQTJYb1M4MgppeFB2WnRYUXBVcHVMMTJhYis5RWFESzhaNFJISllZZkNUM1E1dk5BWGFpV1ErOFBUV20yUWdCUi9ia3dTV2MrCk5wVUZnTlBOOVB2UWk4V0VnNVVtQUdNQ0F3RUFBUT09Ci0tLS0tRU5EIFBVQkxJQyBLRVktLS0tLQ=="
      AllowDevelopmentEnvironment      = "false"

      PdvTokenizerApiBaseURL = "https://api.uat.tokenizer.pdv.pagopa.it"
      PdvTokenizerTestUUID   = "c13b2aec-1597-4abd-a735-aacf2f935c93"

      HubSpidLoginJwtPubKey     = "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUE0TXZaQmMxSFhxbDFPdkZYZnRLcGhkV1pCalRWc0dhWmcvYURhYmt2SE9pdElaYWQrTVJXV3BQSyt1WEVkdjRNN0hjNVFaRVpwOCtoREhLVHZ0TklkWEx0bWpFSCtTV3dYaDdaZU1vUXJqL1RONmVJNTA2TDM5bEdjRnNTWmZtVFlyQVpwcFNRMzM4SWhiWjdjdUtJT0Y3QU4wOUc4VXp2MkUxTGdXSGQzK0UzRldJaWhKckhFQlJpUGY5MGRYVUI4QzR0MmRCZE4xbm15R1lidlJ3bFRpR2UzWkJpQytETVdaQjFZZFFOYUpwb2N3L0orMERPNnBJSmJjWitHSGZnbVpXOG5xOCtBZ3RtOWFRY09UajErYTIydHBrTUM2QzVNaVoxUERuc3R3Qnpmekp2NnVyTkZNUytwNXZWUWpCbTExUHBqZzlDV3ZXcWNtOUFJL21hQXdJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0t",
      HubSpidLoginJwtIssuer     = "api-web.io.pagopa.it/ioweb/auth"
      HubSpidLoginClientBaseUrl = "https://io-p-weu-ioweb-spid-login.azurewebsites.net"

      TrialSystemApiBaseURL  = "https://api.trial.pagopa.it"
      TrialSystemTrialId     = "01J2GN4TA8FB6DPTAX3T3YD6M1"
      TrialSystemFeatureFlag = true
      },
      {
        for s in var.user_func.app_settings :
        s.name => s.key_vault_secret_name != null ? "@Microsoft.KeyVault(VaultName=${var.project}-wallet-kv-01;SecretName=${s.key_vault_secret_name})" : s.value
      }
    )
  }
}
