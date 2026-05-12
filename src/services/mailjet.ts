import Mailjet from "node-mailjet";
import type { SendEmailParams } from "./email";

function getMailjetClient() {
  const apiKey = process.env.MJ_APIKEY_PUBLIC;
  const apiSecret = process.env.MJ_APIKEY_PRIVATE;

  if (!apiKey || !apiSecret) {
    throw new Error("Mailjet API keys are not defined.");
  }

  return Mailjet.apiConnect(apiKey, apiSecret);
}

function getSender() {
  const senderEmail = process.env.MJ_SENDER_EMAIL;
  const senderName = process.env.MJ_SENDER_NAME || "Engenheiro Platform";

  if (!senderEmail) {
    throw new Error("MJ_SENDER_EMAIL is not defined.");
  }

  return { senderEmail, senderName };
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const client = getMailjetClient();
  const { senderEmail, senderName } = getSender();

  try {
    await client
      .post("send", { version: "v3.1" })
      .request({
        Messages: [
          {
            From: {
              Email: senderEmail,
              Name: senderName,
            },
            To: [
              {
                Email: params.toEmail,
                Name: params.toName || params.toEmail,
              },
            ],
            Subject: params.subject,
            TextPart: params.text,
            HTMLPart: params.html,
          },
        ],
      });
  } catch (err: any) {
    const status = err?.statusCode || err?.status || err?.response?.status;
    const body = err?.response?.data || err?.response?.body || err?.body;
    const details = body ? JSON.stringify(body) : "";
    const msg = `Mailjet send failed${status ? ` (status ${status})` : ""}. ${err?.message || ""} ${details}`.trim();
    throw new Error(msg);
  }
}
