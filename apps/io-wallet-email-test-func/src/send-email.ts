import {
  getMailerTransporter,
  sendMail,
} from "@pagopa/io-functions-commons/dist/src/mailer";

export const sendEmailHandler = async () => {
  try {
    // --------- directly from io-functon-common ---------
    // export const MailupMailerConfig = t.interface({
    //     MAILHOG_HOSTNAME: t.undefined,
    //     MAILUP_SECRET: NonEmptyString,
    //     MAILUP_USERNAME: NonEmptyString,
    //     MAIL_TRANSPORTS: t.undefined,
    //     NODE_ENV: t.literal("production"),
    //     SENDGRID_API_KEY: t.undefined
    //   });

    const mailerTransporter = getMailerTransporter({
      MAIL_TRANSPORTS: undefined,
      MAILHOG_HOSTNAME: undefined,
      MAILUP_SECRET: "<MAILUP_SECRET>",
      MAILUP_USERNAME: "<MAILUP_USERNAME>",
      NODE_ENV: "production",
      SENDGRID_API_KEY: undefined,
    } as never);

    const EMAIL_CONFIG = {
      from: "<FROM_EMAIL>",
      htmlToTextOptions: {},
      subject: "IT Wallet - Aggiungi i tuoi documenti al Portafoglio di IO",
      to: "<TO_EMAIL>",
    };

    const result = await sendMail(mailerTransporter, {
      from: EMAIL_CONFIG.from,
      html: "Hello, World!",
      subject: EMAIL_CONFIG.subject,
      text: "Hello, World!",
      to: EMAIL_CONFIG.to,
    })();

    // eslint-disable-next-line no-console, @typescript-eslint/no-explicit-any
    console.log("result is ", (result as any).left);

    return {
      body: "Email sent!",
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log("error is ", error);
    return {
      status: 400,
    };
  }
};
