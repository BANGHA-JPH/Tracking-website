import { Resend } from 'resend';

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
};

/**
 * Clean, lightweight transactional HTML Email Template (Anti-Spam Optimized)
 */
function buildHtmlEmail({ recipientName, title, message, trackingNumber, status, origin, destination, buttonUrl }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
  </head>
  <body style="margin: 0; padding: 20px; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.5;">
    <div style="max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 28px; background-color: #ffffff;">
      
      <!-- Minimal Header -->
      <div style="border-bottom: 2px solid #351C15; padding-bottom: 14px; margin-bottom: 20px;">
        <span style="font-size: 22px; font-weight: 800; color: #351C15; letter-spacing: 0.5px;">UPS</span>
        <span style="font-size: 15px; font-weight: 600; color: #d89600; margin-left: 6px; text-transform: uppercase;">Logistics</span>
      </div>

      <!-- Main Message -->
      <p style="font-size: 15px; color: #1f2937; margin-top: 0;">
        Hello ${recipientName || 'Customer'},
      </p>

      <div style="font-size: 15px; color: #374151; line-height: 1.6; margin-bottom: 20px;">
        ${message.replace(/\n/g, '<br/>')}
      </div>

      ${trackingNumber ? `
      <!-- Simple Details Box -->
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 20px; font-size: 14px;">
        <div style="margin-bottom: 6px;"><strong>Tracking ID:</strong> <span style="font-family: monospace; font-size: 15px; color: #351C15;">${trackingNumber}</span></div>
        ${status ? `<div style="margin-bottom: 6px;"><strong>Status:</strong> ${status}</div>` : ''}
        ${origin || destination ? `<div><strong>Route:</strong> ${origin || 'N/A'} to ${destination || 'N/A'}</div>` : ''}
      </div>
      ` : ''}

      ${buttonUrl ? `
      <!-- Simple Track Link Button -->
      <div style="margin: 24px 0 20px 0;">
        <a href="${buttonUrl}" style="background-color: #351C15; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-weight: 600; font-size: 14px; display: inline-block;">
          Track Shipment Online &rarr;
        </a>
      </div>
      ` : ''}

      <!-- Simple Clean Footer -->
      <div style="border-top: 1px solid #f3f4f6; margin-top: 28px; padding-top: 16px; font-size: 12px; color: #6b7280; text-align: left;">
        <p style="margin: 0;">UPS Global Logistics Support &bull; <a href="https://ups-global-shipping.com" style="color: #6b7280; text-decoration: underline;">ups-global-shipping.com</a></p>
      </div>

    </div>
  </body>
  </html>
  `;
}

/**
 * Main email sender service
 */
export async function sendEmail({ to, recipientName, subject, messageBody, templateType, shipment, buttonUrl }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'UPS Support <support@ups-global-shipping.com>';

  let emailSubject = subject || 'Update regarding your UPS Shipment';
  let trackingCode = shipment?.id || '';
  let status = shipment?.status || '';
  let origin = shipment?.origin || '';
  let destination = shipment?.destination || '';

  if (templateType === 'OUT_FOR_DELIVERY') {
    emailSubject = subject || `Out for Delivery: UPS Package #${trackingCode}`;
  } else if (templateType === 'SHIPMENT_UPDATE') {
    emailSubject = subject || `Shipment Update: UPS Package #${trackingCode}`;
  } else if (templateType === 'DELAY_NOTICE') {
    emailSubject = subject || `Important Notice: Update on UPS Package #${trackingCode}`;
  }

  const html = buildHtmlEmail({
    recipientName: recipientName || to.split('@')[0],
    title: emailSubject,
    message: messageBody,
    trackingNumber: trackingCode,
    status: status,
    origin: origin,
    destination: destination,
    buttonUrl: buttonUrl
  });

  // Build clean plain text version (Crucial for spam filter pass)
  const textContent = `Hello ${recipientName || to.split('@')[0]},

${messageBody}

${trackingCode ? `Tracking Code: ${trackingCode}\nStatus: ${status || 'IN TRANSIT'}\nRoute: ${origin || 'N/A'} -> ${destination || 'N/A'}\n` : ''}
Track package: ${buttonUrl || 'https://ups-global-shipping.com'}

UPS Global Logistics Support`;

  if (!apiKey) {
    console.warn('[EMAIL SERVICE WARNING] RESEND_API_KEY is missing in backend .env. Simulation mode only.');
    console.log(`[SIMULATED EMAIL] To: ${to} | Subject: ${emailSubject}`);
    return { success: true, simulated: true, message: 'Email simulated (RESEND_API_KEY missing).' };
  }

  try {
    const resend = getResendClient();
    const response = await resend.emails.send({
      from: fromEmail,
      to: [to],
      replyTo: 'support@ups-global-shipping.com',
      subject: emailSubject,
      html: html,
      text: textContent,
      headers: {
        'X-Entity-Ref-ID': `UPS-MSG-${Date.now()}`
      }
    });

    if (response.error) {
      console.error('[RESEND API ERROR]:', response.error);
      throw new Error(response.error.message || 'Resend API rejected email delivery.');
    }

    console.log(`[EMAIL SENT] Successfully sent email to ${to} (ID: ${response.data?.id})`);
    return { success: true, id: response.data?.id };
  } catch (err) {
    console.error('[EMAIL SERVICE EXCEPTION]:', err);
    throw err;
  }
}
