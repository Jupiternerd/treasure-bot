import { Resend } from "resend";
import { config } from "./config";

const resend = new Resend(config.RESEND_API_KEY);

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
): Promise<string> {
  const { data, error } = await resend.emails.send({
    from: config.RESEND_FROM_EMAIL,
    to,
    subject,
    text: body,
  });
  if (error) throw new Error(error.message);
  return data!.id;
}
