export type SendEmailParams = {
  toEmail: string;
  toName?: string;
  subject: string;
  text: string;
  html: string;
};

function hasSendGrid() {
  const key = String(process.env.SENDGRID_API_KEY || "").trim();
  // Only treat SendGrid as enabled when the key looks like a real SendGrid API key.
  // This prevents accidental fallthrough to SendGrid when an old/invalid env var is still present.
  return key.startsWith("SG.");
}

async function sendWithSendGrid(params: SendEmailParams): Promise<void> {
  const apiKey = String(process.env.SENDGRID_API_KEY || "").trim();
  const senderEmail = String(process.env.SENDGRID_SENDER_EMAIL || "").trim();
  const senderName = String(process.env.SENDGRID_SENDER_NAME || "Engenheiro Platform").trim();

  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is not defined.");
  }
  // SendGrid keys normally start with "SG.". If it doesn't, it's almost certainly wrong/truncated.
  if (!apiKey.startsWith("SG.")) {
    throw new Error("SENDGRID_API_KEY looks invalid (expected it to start with 'SG.').");
  }
  if (!senderEmail) {
    throw new Error("SENDGRID_SENDER_EMAIL is not defined.");
  }

  // Lazy import so the app can start even if dependency isn't installed in some environments.
  const sg = await import("@sendgrid/mail");
  sg.default.setApiKey(apiKey);

  await sg.default.send({
    to: params.toName ? { email: params.toEmail, name: params.toName } : params.toEmail,
    from: { email: senderEmail, name: senderName },
    subject: params.subject,
    text: params.text,
    html: params.html,
  });
}

async function sendWithMailjet(params: SendEmailParams): Promise<void> {
  const { sendEmail } = await import("./mailjet");
  await sendEmail(params);
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  if (hasSendGrid()) {
    return sendWithSendGrid(params);
  }
  return sendWithMailjet(params);
}
