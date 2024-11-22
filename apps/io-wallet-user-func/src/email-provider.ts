import * as TE from "fp-ts/lib/TaskEither";

import { type MailServiceConfig } from "./app/config";

export const sendEmail = (mailServiceConfig: MailServiceConfig) =>
  mailServiceConfig.enabled
    ? TE.tryCatch(
        async () => {
          await fetch(
            new URL(`/messages/sendmessage`, mailServiceConfig.serviceBaseUrl),
            {
              body: JSON.stringify({
                Attachments: null,
                Bcc: [],
                Cc: [],
                CharSet: "utf-8",
                EmbeddedImages: [],
                ExtendedHeaders: null,
                From: { Email: "test@test.test", Name: "Test User" },
                Html: {
                  Body: "<div>Hello Mr. [firstname] [lastname], how are you today?",
                  BodyTag: "<body>",
                  DocType: null,
                  Head: null,
                },
                ReplyTo: null,
                Subject: "Testing email",
                Text: "Testing email",
                To: [
                  {
                    Email: "christian.alessandro.atzeni@it.ey.com",
                    Name: "Christian Alessandro Atzeni",
                  },
                ],
                User: {
                  Secret: mailServiceConfig.accountSecret,
                  Username: mailServiceConfig.accountUsername,
                },
                XSmtpAPI: {
                  CampaignCode: "1001",
                  CampaignName: "Test Campaign",
                  CampaignReport: null,
                  ClickTracking: null,
                  DynamicFields: [
                    { N: "firstname", V: "Christian Alessandro" },
                    { N: "lastname", V: "Atzeni" },
                  ],
                  Footer: true,
                  Header: false,
                  Priority: null,
                  Schedule: "2021-09-14T17:58+02:00",
                  SkipDynamicFields: null,
                  ViewTracking: null,
                },
              }),
              method: "POST",
              signal: AbortSignal.timeout(mailServiceConfig.requestTimeout),
            },
          );
        },
        (error) =>
          new Error(
            `Error occurred while sending email, during the wallet instance creation: ${error}`,
          ),
      )
    : TE.of(true);
