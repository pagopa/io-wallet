locals {
  function_app_user_common_app_settings = merge({
    FUNCTIONS_WORKER_RUNTIME = "node"
    NODE_ENV                 = "production"

    // Keepalive fields are all optionals
    FETCH_KEEPALIVE_ENABLED             = "true"
    FETCH_KEEPALIVE_SOCKET_ACTIVE_TTL   = "110000"
    FETCH_KEEPALIVE_MAX_SOCKETS         = "40"
    FETCH_KEEPALIVE_MAX_FREE_SOCKETS    = "10"
    FETCH_KEEPALIVE_FREE_SOCKET_TIMEOUT = "30000"
    FETCH_KEEPALIVE_TIMEOUT             = "60000"

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
    AndroidBundleIdentifiers         = "it.pagopa.io.app,it.pagopa.app.io.poc.itwallet,UnknownPackage"
    AndroidCrlUrl                    = "https://android.googleapis.com/attestation/status"
    AndroidPlayIntegrityUrl          = "https://www.googleapis.com/auth/playintegrity"
    AndroidPlayStoreCertificateHash  = "feT-Pqrgg__NiwcDAehlAtPx6tHdZqwUK618VEdVT4I"
    AppleRootCertificate             = "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNJVENDQWFlZ0F3SUJBZ0lRQy9PK0R2SE4wdUQ3akc1eUgySVhtREFLQmdncWhrak9QUVFEQXpCU01TWXdKQVlEVlFRRERCMUJjSEJzWlNCQmNIQWdRWFIwWlhOMFlYUnBiMjRnVW05dmRDQkRRVEVUTUJFR0ExVUVDZ3dLUVhCd2JHVWdTVzVqTGpFVE1CRUdBMVVFQ0F3S1EyRnNhV1p2Y201cFlUQWVGdzB5TURBek1UZ3hPRE15TlROYUZ3MDBOVEF6TVRVd01EQXdNREJhTUZJeEpqQWtCZ05WQkFNTUhVRndjR3hsSUVGd2NDQkJkSFJsYzNSaGRHbHZiaUJTYjI5MElFTkJNUk13RVFZRFZRUUtEQXBCY0hCc1pTQkpibU11TVJNd0VRWURWUVFJREFwRFlXeHBabTl5Ym1saE1IWXdFQVlIS29aSXpqMENBUVlGSzRFRUFDSURZZ0FFUlRIaG1MVzA3QVRhRlFJRVZ3VHRUNGR5Y3RkaE5iSmhGcy9JaTJGZENnQUhHYnBwaFkzK2Q4cWp1RG5nSU4zV1ZoUVVCSEFvTWVRL2NMaVAxc09VdGdqcUs5YXVZZW4xbU1FdlJxOVNrM0ptNVg4VTYySCt4VEQzRkU5VGdTNDFvMEl3UURBUEJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJTc2tSQlRNNzIrYUVIL3B3eXA1ZnJxNWVXS29UQU9CZ05WSFE4QkFmOEVCQU1DQVFZd0NnWUlLb1pJemowRUF3TURhQUF3WlFJd1FnRkduQnl2c2lWYnBUS3dTZ2Ewa1AwZThFZURTNCtzUW1UdmI3dm41M081K0ZSWGdlTGhwSjA2eXNDNVByT3lBakVBcDVVNHhEZ0VnbGxGN0VuM1ZjRTNpZXhaWnRLZVlucHF0aWpWb3lGcmFXVkl5ZC9kZ2FubXJkdUMxYm1UQkd3RAotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0t"
    GooglePublicKey                  = "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQ0lqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FnOEFNSUlDQ2dLQ0FnRUFyN2JIZ2l1eHB3SHNLN1F1aTh4VQpGbU9yNzVndk1zZC9kVEVEREpkU1N4dGY2QW43eHlxcFJSOTBQTDJhYnhNMWRFcWxYbmYydHF3MU5lNFh3bDVqCmxSZmRuSkxtTjBwVHkvNGxqNC83dHYwU2szaWlLa3lwbkVVdFI2V2ZNZ0gwUVpmS0hNMStkaSt5OVRGUnR2NnkKLy8wcmIrVCtXOGE5bnNOTC9nZ2puYXI4NjQ2MXFPMHJPczJjWGpwM2tPRzFGRUo1TVZtRm1CR3RucktwYTczWApwWHlUcVJ4Qi9NMG4xbi9XOW5HcUM0RlNZYTA0VDZONVJJWkdCTjJ6Mk1UNUlLR2JGbGJDOFVyVzBEeFc3QVlJCm1RUWNIdEdsL20wMFFMVld1dEhRb1ZKWW5GUGxYVGNIWXZBU0x1K1JoaHNiRG14TWdKSjBtY0RwdnNDNFBqdkIKK1R4eXdFbGdTNzB2RTBYbUxEK09KdHZzQnNsSFp2UEJLQ09kVDBNUyt0Z1NPSWZnYSt6MVoxZzcrRFZhZ2Y3cQp1dm1hZzhqZlBpb3lLdnhuSy9FZ3NUVVZpMmdoenE4d20yN3VkL21JTTdBWTJxRU9SUjhHbzNUVkI0SHpXUWdwClpydDNpNU1JbENhWTUwNEx6U1JpaWdIQ3pBUGxId3MrVzByQjVOK2VyNS8ycEpLbmZCU0RpQ2lGQVZ0Q0xPWjcKZ0xpTW0wamhPMkI2dFVYSEkvK01SUGp5MDJpNTlsSU5NUlJldjU2R0t0Y2Q5cU8vMGtVSldkWlRkQTJYb1M4MgppeFB2WnRYUXBVcHVMMTJhYis5RWFESzhaNFJISllZZkNUM1E1dk5BWGFpV1ErOFBUV20yUWdCUi9ia3dTV2MrCk5wVUZnTlBOOVB2UWk4V0VnNVVtQUdNQ0F3RUFBUT09Ci0tLS0tRU5EIFBVQkxJQyBLRVktLS0tLQ=="
    HardwarePublicTestKey            = "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZrd0V3WUhLb1pJemowQ0FRWUlLb1pJemowREFRY0RRZ0FFMDFtMHhmNXVqUTVnMjJGdloyemJGcnZ5THg5YgpnTjJBaUxWRnRjYTJCVUh0a2dwV3Y5WUpDRElzNmxQS3hWU3NFb25QVXZPTTJVcmNNUGdwMDRZZU9nPT0KLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0t"

    PidIssuerApiBaseURL           = "https://util.wallet.ipzs.it"
    PidIssuerApiClientCertificate = "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUM4RENDQWRpZ0F3SUJBZ0lVRnhWVkZnNFYzOTA3VWY0ZHVXZExURWFIQTVJd0RRWUpLb1pJaHZjTkFRRUwKQlFBd0R6RU5NQXNHQTFVRUF3d0VjbTl2ZERBZUZ3MHlOREEzTWpNeE1EQTBNREphRncwek5EQTNNakV4TURBMApNREphTUJFeER6QU5CZ05WQkFNTUJtTnNhV1Z1ZERDQ0FTSXdEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDCkFRb0NnZ0VCQUxsUHd2TTBxbTVvNGpoVHQ4cGRxYkhTR1pPbmpoejJSZG1iaVpkbmZqdm5UbCtwcVcwY1BRNHcKVk0xQkQrYllDKzVjbTVNRmRkNkt3SWM1SjBaRzJTcy9adEZpRTJKMnEvM084VDlkY0tQNHRBY0ZMcnVaTEtRbQpWZk5vZng4ZzN1cktBL01lTUhxZTR3U1RQU25iUGNPd0tYMmdsQlE2bU0vODdUdHdvd2RrWE9La1RkRGRDZlZMCjNyODhEVGNYR0ZDM2VsZlU1bSs4ZlUvVFVKMzMzMkR2MjNqRGY2ZEVPaUEwaDRBNTZob3FNLzlYQkU0OVZBNjMKakMzdlRKL0pObGFDMnlRYSs5Zno3TFRMV09WUFdNdFFhTm1XNGN4TnVJM01WZi8rWkFnOFNibWVkUG5rRjV5RApJeWlmM0pVb3F2elJjQ2JMaFg4Z0t5UU02UUxKVWI4Q0F3RUFBYU5DTUVBd0hRWURWUjBPQkJZRUZPZTJWTUE5Cll2eDBIWDYvdE1xeUkxNysxS05ZTUI4R0ExVWRJd1FZTUJhQUZGZFFmeGRsUUsvTEhzMjE4V2txQmp0c1daSWYKTUEwR0NTcUdTSWIzRFFFQkN3VUFBNElCQVFBb1lZL2tsQW1OVDA5TFZVU0JhZ3Fla0hwVnhJMjZCSVZUUHRuagpKdExsTXd0RHgxZHA5VGNXN3A4ZHFNaVVyWm4vVm10Vm9IUU95c3IrQlNuNHRqTG1taGtJQ2Zacm05SXQxTVA5ClIzWUdOVS96dzZSTlVpSGVCRnY2Snk0emI3dk1Nck1TM2h3eXdaMk0xaUlhZVdHeitFOHdNSDk1UVkxQU8rZjYKaERNa3p1dkJIVDhOQ1lRTTNOSlFNWFh1Nkx5VHBBQU93a3VlNHhmMjBmSXpYc1g1VGFTYXJZOXZ2VHJueW43awpBRkNQREkycTZ6MUNPcHNOcVlNMld2c014Y1ZNRU4zZEFZYWVMUlAzODNyVk9Ua1pnckN0SVlPYlVUNzVTSi81CkxMOVd1Zm1XY2xMY1BLR3UzRTBaZnIxM1daR1E5eW5EaEIwb01wUnpOdWFmN2hJMAotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg=="
    PidIssuerApiRootCACertificate = "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUhkVENDQlYyZ0F3SUJBZ0lRWERzL042MzhLUDRQejlPcitEK0ZVVEFOQmdrcWhraUc5dzBCQVFzRkFEQnIKTVFzd0NRWURWUVFHRXdKSlZERU9NQXdHQTFVRUJ3d0ZUV2xzWVc0eEl6QWhCZ05WQkFvTUdrRmpkR0ZzYVhNZwpVeTV3TGtFdUx6QXpNelU0TlRJd09UWTNNU2N3SlFZRFZRUUREQjVCWTNSaGJHbHpJRUYxZEdobGJuUnBZMkYwCmFXOXVJRkp2YjNRZ1EwRXdIaGNOTWpBd056QTJNRGN5TURVMVdoY05NekF3T1RJeU1URXlNakF5V2pDQmlURUwKTUFrR0ExVUVCaE1DU1ZReEVEQU9CZ05WQkFnTUIwSmxjbWRoYlc4eEdUQVhCZ05WQkFjTUVGQnZiblJsSUZOaApiaUJRYVdWMGNtOHhGekFWQmdOVkJBb01Ea0ZqZEdGc2FYTWdVeTV3TGtFdU1UUXdNZ1lEVlFRRERDdEJZM1JoCmJHbHpJRTl5WjJGdWFYcGhkR2x2YmlCV1lXeHBaR0YwWldRZ1UyVnlkbVZ5SUVOQklFY3pNSUlDSWpBTkJna3EKaGtpRzl3MEJBUUVGQUFPQ0FnOEFNSUlDQ2dLQ0FnRUFzNzNDaCt0Mm93bTNheVRreXF5ME9QdUNUaXlieFR5Uwo0Y1U0eTB0MlJHU3dDTmpMaC9yY3V0TzB5b3JpWnhWdFByTk1jSVJRNTQ0QlFoSEZ0L3lwVzdlK3Q4d1dLckhhCnIzQmtLd1NVYnFOd3BEV1AxYlhzN0lKVFZoSFhXR0FtN0FrMUZocnJCbXRYazhRdGR6VHpERHV4ZkZCSzdzQ0wKTjBKZHFvcWIxVjF6M3dzV3FBdnI0S2xTQ0ZXMDVOaDRiYVdtL2tYT21iOFUrWFI2a1VtdW9WdmlhM2lCaG90UgpUekFIVE85U1dXa2dqVGNpci9uaEJ2eUwyUm9xa2dZeVAvazUwYnpuYVZPR0ZuRld6ZmwwWG5yTS9zYWxmQ0JoCk8wLzF2TmFvVThlbFI2QXRiZENGQXVwZ1F5OTVHdUZJUlZTOG4vY0YwUXVwZlBqVWwra0dTTHp2R0FjKzZvTkUKYWxwQWhLSVMvK1AwdU9EelJyUzlFcTBXWDFpU2o2S0h0UU1OTjRaS3NTNG5zdXZZQ2FobkFjMFF3UXlvZHVBVwppVS95bmhVOVdUSUVlMVZJb0VERTc5TlBPSTIvODBScWJacWRwQUtVYWYwRnZ1cVZYaEVjamlKSnUrZDB3OVlOCmI3Z3VyZDZ4a2FTWGVtVy9mUDRpZEJpTmtkOGFDVkFkc2hHUVluNnloK25hMEx1NUlHODhaMmtTSUZjWER0d3kKempjeGtXODZwd2tPNkdla0VvbVZCTktjdjBDZXkyU21mOHVocFprMTVUU0NleUZEclpCV0g5T3NEc3QvVG5oegpwTjE1Nkh1dzNNM1JSZEVlZ3QzM2ZjeVB5a2d0MEhUaHhyRXY5RHdPemhzNmxDUTVSTlFKTzdadlpGMVppcWdUCkZPSjZ2czF4TXFFQ0F3RUFBYU9DQWZRd2dnSHdNQThHQTFVZEV3RUIvd1FGTUFNQkFmOHdId1lEVlIwakJCZ3cKRm9BVVV0aUlPc2lmZUdidGlmTjdPSENVeVFJQ050QXdRUVlJS3dZQkJRVUhBUUVFTlRBek1ERUdDQ3NHQVFVRgpCekFCaGlWb2RIUndPaTh2YjJOemNEQTFMbUZqZEdGc2FYTXVhWFF2VmtFdlFWVlVTQzFTVDA5VU1FVUdBMVVkCklBUStNRHd3T2dZRVZSMGdBREF5TURBR0NDc0dBUVVGQndJQkZpUm9kSFJ3Y3pvdkwzZDNkeTVoWTNSaGJHbHoKTG1sMEwyRnlaV0V0Wkc5M2JteHZZV1F3SFFZRFZSMGxCQll3RkFZSUt3WUJCUVVIQXdJR0NDc0dBUVVGQndNQgpNSUhqQmdOVkhSOEVnZHN3Z2Rnd2daYWdnWk9nZ1pDR2dZMXNaR0Z3T2k4dmJHUmhjREExTG1GamRHRnNhWE11CmFYUXZZMjRsTTJSQlkzUmhiR2x6SlRJd1FYVjBhR1Z1ZEdsallYUnBiMjRsTWpCU2IyOTBKVEl3UTBFc2J5VXoKWkVGamRHRnNhWE1sTWpCVExuQXVRUzRsTW1Zd016TTFPRFV5TURrMk55eGpKVE5rU1ZRL1kyVnlkR2xtYVdOaApkR1ZTWlhadlkyRjBhVzl1VEdsemREdGlhVzVoY25rd1BhQTdvRG1HTjJoMGRIQTZMeTlqY213d05TNWhZM1JoCmJHbHpMbWwwTDFKbGNHOXphWFJ2Y25rdlFWVlVTQzFTVDA5VUwyZGxkRXhoYzNSRFVrd3dIUVlEVlIwT0JCWUUKRkorS3NiWHhzZDZDOUNkOHZvak4zcWxEZ2FOTE1BNEdBMVVkRHdFQi93UUVBd0lCQmpBTkJna3Foa2lHOXcwQgpBUXNGQUFPQ0FnRUFKYnlnTW5LSjVNNmJ5cjVFY3RxMDVPRHF3Tk10a3k4VEVGM081NWc2UkhoeGJsZjZPZWdaCjR1aTQrRWxITk9JWGp5Y2JldVVHdUZBNExTY0NDOWZuSTFSbm44VEkyUTdPUDVZV2lmRWZucmRwOTl0L3RKelEKaGZkaTdaVGRSUlpaR1Y5eCtncmZSL1J0alQyQzNMdDlYNGxjYnVTeFRlYTNQSEF3d2kwQTNiWVJSMUw1Y2lQbQplQW5ZdEc5a3BhdDgvUnVDMjJveGlaWjVGZGpVNndyUldrQVNSTGlJd05jRklZZnZwVWJNV0VsYUNVaHFhQjJ5Cll2V0Y4bzAycG5hWWI0YnZUQ2c0Y1ZhYlZub2pVdXVYSDgxTGVRaGhzU1hMd2Nkd1NkZXcwTkw0ekNpTkNuMlEKaURacHoyYmlDV0RnZ2libVd4c1VVRjZBYnFNSG53c2RTOHZzS1hpRlFKSGVBZE5BaEEra3dwcVlBZGhVaUNkagpSVFVkdFJOVXVjTHZaRU4xT0F2Vll5b2c5eFlDZmh0a3FnWFFST01BTlArWi8reWFaYWhhUC9WZ2FrL1YwMHNlCkhkaDdGK0I2aDVIVmR3ZGgrMTdFMmpsK2FNVGZ5dkJGY2cySC85UWp5bDRUWThOVy82djBEUEs1MnNWdDhhMzUKSSs3eExHTFBvaEFsNHo2cEVmMk94Z2pNTmZYWENYUzMzc21SZ3oxZExRRm84VXBBYjNyZjg0emtYYXFFSTZRaQoyUCs1cGliVkZRaWdSYm40UmNFK0syYS9ubTJNL28rV1pUU2lvK0UrWVhhY25OazcxVmNPODJiaU9vZitqQktUCmlDM1hpN3JBbHlwbW1lK1FGQnc5RjFKODlpZzNzbVYvSGFOOHRPMGxmVHB2bTdadnpkNVRrTXM9Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0KLS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUZ1ekNDQTZPZ0F3SUJBZ0lJVndvUmwwTEU0OHd3RFFZSktvWklodmNOQVFFTEJRQXdhekVMTUFrR0ExVUUKQmhNQ1NWUXhEakFNQmdOVkJBY01CVTFwYkdGdU1TTXdJUVlEVlFRS0RCcEJZM1JoYkdseklGTXVjQzVCTGk4dwpNek0xT0RVeU1EazJOekVuTUNVR0ExVUVBd3dlUVdOMFlXeHBjeUJCZFhSb1pXNTBhV05oZEdsdmJpQlNiMjkwCklFTkJNQjRYRFRFeE1Ea3lNakV4TWpJd01sb1hEVE13TURreU1qRXhNakl3TWxvd2F6RUxNQWtHQTFVRUJoTUMKU1ZReERqQU1CZ05WQkFjTUJVMXBiR0Z1TVNNd0lRWURWUVFLREJwQlkzUmhiR2x6SUZNdWNDNUJMaTh3TXpNMQpPRFV5TURrMk56RW5NQ1VHQTFVRUF3d2VRV04wWVd4cGN5QkJkWFJvWlc1MGFXTmhkR2x2YmlCU2IyOTBJRU5CCk1JSUNJakFOQmdrcWhraUc5dzBCQVFFRkFBT0NBZzhBTUlJQ0NnS0NBZ0VBcDhiRXBTbWtMTy9sR01Xd1VLTnYKVVR1ZkNsckp3a2c0Q3NJY29CaC9rYldIdVVBLzNSMW9Id2lEMVMwZWlLRDRqMWFQYlprQ2twQVcxVjhJYkluWAo0YXk4SU1LeDRJTlJpbWxOQUpaYWJ5L0FSSDZqRHVTUnpWanUzUHZISGtWSDNTZTVDQUdmcGlFZDlVRXRMMHo5CktLM2dpcTBpdEZabGpvWlVqNU5ES2Q0NVJuaWpNQ082emZCOUUxZkFYZEtEYTBoTXhLdWZnRnBiT3IzSnB5SS8KZ0Njeld3NjNpZ3hkQnpjSXkyelNla2NpUkRYRnpNd3VqdDBxN2JkOVpnMWZZVkVpVlJ2alJ1UGpQZEExWXByYgpyeFRJVzZITWlSdmhNQ2I4b0pzZmdhZEhId1Ryb3ptU0JwK1owNy9UNms5UW5Cbitsb2NlUEdYMm94Z2tnNFlRCjUxUStxRHAySkUrQkljWGpEd0w0azVSSElMdisxQTdUYUxuZHhIcUVndU5UVkhuZDI1elM4Z2ViTHJhOFB1MkYKYmU4bEVmS1hHa0poOTBxWDZJdXhFQWY2WllHeW9qblA5enovR1B2RzhWcUxXZUlDckh1UzBFNFVUMWxGOWd4ZQpLRit3NkQ5Rno4K3ZtMi83aE5OM1dwVnZySlNFbnU2OHdFcVBTcFA0UkNIaU1VVmhVRTRRMk9NMWZFd1p0TjRGCnY2TUduOGkxemVRZjF4Y0dEWHFWZEZVTmFCcjhFQnRpWkoxdDRKV2d3NVFIVncwVTVyMEYrN2lmNXQrTDRzYm4KZnBiMlU4V0FORkFvV1BBU1VIRVhNTHJtZUdPODlMS3RteXV5L3VFNWpGNjZDeUNVM251RHVQL2pWbzIzRWVrNwpqUEt4d1YyZHBBdE1LOW15R1BXMW4wc0NBd0VBQWFOak1HRXdIUVlEVlIwT0JCWUVGRkxZaURySW4zaG03WW56CmV6aHdsTWtDQWpiUU1BOEdBMVVkRXdFQi93UUZNQU1CQWY4d0h3WURWUjBqQkJnd0ZvQVVVdGlJT3NpZmVHYnQKaWZON09IQ1V5UUlDTnRBd0RnWURWUjBQQVFIL0JBUURBZ0VHTUEwR0NTcUdTSWIzRFFFQkN3VUFBNElDQVFBTAplM0tId0dDbVNVeUlXT1lkaVBjVVpFaW0yRmdLRGs4VE5kODFIZFR0QmpISWdUNXExZDA3R2pMdWtEMFIwaTcwCmpzTmpMaU5tc0dlK2I3YkFFemxncXFJMEpaTjFVdDZubmEwT2g0bFNjV29XUEJrZGcvaWFLV1crOUQrYTJmRHoKV29jaGNZQk55K0E0bXorNyt1QXdUYytHMDJVUUdSalJsd0t4SzNKQ2FLeWd2VTVhMmhpL2E1aUIwUDJhdmw0VgpTTTBSRmJuQUtWeTA2SWozUGphdXQyTDlIbUxlY0hnUUhFaGIycnlrT0xwbjdWVStYbGZmMUFOQVRJR2swazlqCnB3bENDUlQ4QUtuQ2dITlBMc0JBMlJGN1NPcDZBc0RUNnlnQkpsaDB3Y0J6SW0yVGxmMDVmYnNxNC9hQzR5eVgKWDA0ZmtaVDYvaXlqMkhZYXVFMnlPRStiK2gxSVlIa200dlA5cWRDYTZIQ1BTWHJXNWIwS0R0c3Q4NDIvNitPawpmY3ZIbFhIbzJxTjh4Y0w0ZEpJRUc0YXNwQ0pUUUxhcy9reDJ6L3VVTXNBMW4zWS9idVdRYnFDbUpxSzRMTDdSCks0WDlwMmpJdWdFcnNXeDBIYmh6bGVmdXQ4Y2w4QUJNQUxKK3RndUxIUFBBVUo0bHVlQUkzalptL3plbDBidFUKWkN6Sko3VkxrbjVsLzlNdDRibE92SCtrUVNHUVFYZW1PUi9xbnVPZjBHWnZCZXlxZG42L2F4YWc2N1hIL0pKVQpMeXNSSnlVM2VFeFJhckR6ekZoZEZQRnFTQlgvd2dlMnNZMFBqbHhRUnJNOXZ3R1lUN0paVkVjK05IdDRiVmFUCkxuUHFaaWg0elIwVXY2Q1BMeTY0TG83eUZJck02YlY4KzJ5ZERLWGhsZz09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K"
    PidIssuerHealthCheckEnabled   = true

    RevocationQueueName = var.revocation_queue_name

    WEBSITE_SWAP_WARMUP_PING_PATH     = "/api/v1/wallet/health"
    WEBSITE_SWAP_WARMUP_PING_STATUSES = "200"
    },
    local.function_apps.common_app_settings,
    {
      for s in var.user_func.app_settings :
      s.name => s.key_vault_secret_name != null ? "@Microsoft.KeyVault(VaultName=${var.key_vault_wallet_name};SecretName=${s.key_vault_secret_name})" : s.value
    }
  )

  function_app_user_slot_disabled = [
    "addWalletInstanceToValidationQueue",
    "validateWalletInstance",
    "generateEntityConfiguration"
  ]

  function_app_user = {
    app_settings = merge(local.function_app_user_common_app_settings,
      {
        for to_disable in local.function_app_user_slot_disabled :
        format("AzureWebJobs.%s.Disabled", to_disable) => 0
      }
    )
    slot_app_settings = merge(local.function_app_user_common_app_settings,
      {
        for to_disable in local.function_app_user_slot_disabled :
        format("AzureWebJobs.%s.Disabled", to_disable) => 1
      }
    )
  }

  function_app_support = {
    app_settings = merge({
      FUNCTIONS_WORKER_RUNTIME = "node"
      NODE_ENV                 = "production"

      // Keepalive fields are all optionals
      FETCH_KEEPALIVE_ENABLED             = "true"
      FETCH_KEEPALIVE_SOCKET_ACTIVE_TTL   = "110000"
      FETCH_KEEPALIVE_MAX_SOCKETS         = "40"
      FETCH_KEEPALIVE_MAX_FREE_SOCKETS    = "10"
      FETCH_KEEPALIVE_FREE_SOCKET_TIMEOUT = "30000"
      FETCH_KEEPALIVE_TIMEOUT             = "60000"

      WEBSITE_SWAP_WARMUP_PING_PATH     = "/api/v1/wallet/health"
      WEBSITE_SWAP_WARMUP_PING_STATUSES = "200"
      },
      local.function_apps.common_app_settings,
      {
        for s in var.support_func.app_settings :
        s.name => s.key_vault_secret_name != null ? "@Microsoft.KeyVault(VaultName=${var.key_vault_wallet_name};SecretName=${s.key_vault_secret_name})" : s.value
      }
    )
  }

  function_apps = {
    common_app_settings = {
      CosmosDbEndpoint__accountEndpoint = var.cosmos_db_endpoint

      CosmosDbDatabaseName   = var.cosmos_database_name
      CosmosDbRequestTimeout = "5000"

      PidIssuerApiRequestTimeout = "10000"

      HttpRequestTimeout = "5000"
    }
  }
}
