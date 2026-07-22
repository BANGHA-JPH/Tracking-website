import { Resend } from 'resend';

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
};

/**
 * Professional, clean transactional HTML Email Template (Anti-Spam & Delivery Optimized)
 */
function buildHtmlEmail({ recipientName, title, message, trackingNumber, status, origin, destination, buttonUrl, credentials }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
  </head>
  <body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">
    <div style="max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; padding: 32px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
      
      <!-- Professional UPS Header Bar -->
      <div style="border-bottom: 3px solid #FFB500; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 24px; font-weight: 900; color: #351C15; letter-spacing: 0.5px;">UPS</span>
          <span style="font-size: 14px; font-weight: 700; color: #d89600; margin-left: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Global Logistics</span>
        </div>
      </div>

      <!-- Main Subject Title -->
      <h2 style="font-size: 18px; font-weight: 700; color: #351C15; margin-top: 0; margin-bottom: 16px;">
        ${title}
      </h2>

      <!-- Main Message -->
      <p style="font-size: 15px; color: #334155; margin-top: 0;">
        Hello <strong>${recipientName || 'Customer'}</strong>,
      </p>

      <div style="font-size: 15px; color: #334155; line-height: 1.6; margin-bottom: 24px;">
        ${message.replace(/\n/g, '<br/>')}
      </div>

      ${credentials ? `
      <!-- Account Credentials Card -->
      <div style="background-color: #fdfbf7; border: 1px solid #fcd34d; border-left: 4px solid #FFB500; border-radius: 6px; padding: 18px; margin-bottom: 24px;">
        <div style="font-size: 12px; font-weight: 800; color: #351C15; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
          🔑 Customer Portal Login Credentials
        </div>
        <div style="font-size: 14px; color: #334155; margin-bottom: 6px;">
          <strong>Username / Email:</strong> <span style="font-family: monospace; font-weight: 600; color: #0f172a;">${credentials.email}</span>
        </div>
        <div style="font-size: 14px; color: #334155;">
          <strong>Password:</strong> <span style="font-family: monospace; font-weight: 700; background: #fff3c4; padding: 3px 8px; border-radius: 4px; color: #351C15; border: 1px solid #fde047;">${credentials.password}</span>
        </div>
      </div>
      ` : ''}

      ${trackingNumber ? `
      <!-- Shipment Summary Box -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px; font-size: 14px;">
        <div style="font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
          📦 Shipment Overview
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: #64748b;">Tracking Code:</span>
          <strong style="font-family: monospace; font-size: 15px; color: #351C15;">${trackingNumber}</strong>
        </div>
        ${status ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: #64748b;">Status:</span>
          <strong style="color: #351C15;">${status}</strong>
        </div>
        ` : ''}
        ${origin || destination ? `
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #64748b;">Transport Route:</span>
          <strong style="color: #334155;">${origin || 'Origin'} &rarr; ${destination || 'Destination'}</strong>
        </div>
        ` : ''}
      </div>
      ` : ''}

      ${buttonUrl ? `
      <!-- Track Link CTA Button -->
      <div style="margin: 28px 0 24px 0; text-align: center;">
        <a href="${buttonUrl}" style="background-color: #351C15; color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 6px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          Track Package Online &rarr;
        </a>
      </div>
      ` : ''}

      <!-- Clean Footer -->
      <div style="border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 20px; font-size: 12px; color: #64748b; text-align: center;">
        <p style="margin: 0 0 4px 0; font-weight: 600;">UPS Global Logistics Network</p>
        <p style="margin: 0;">This is an official transactional message sent from the UPS Logistics Portal.</p>
      </div>

    </div>
  </body>
  </html>
  `;
}

/**
 * Main email sender service
 */
export async function sendEmail({ to, recipientName, subject, messageBody, templateType, shipment, buttonUrl, credentials }) {
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
  } else if (templateType === 'NEW_REGISTRATION') {
    emailSubject = subject || `UPS Shipment Confirmation & Credentials - #${trackingCode}`;
  }

  const html = buildHtmlEmail({
    recipientName: recipientName || to.split('@')[0],
    title: emailSubject,
    message: messageBody,
    trackingNumber: trackingCode,
    status: status,
    origin: origin,
    destination: destination,
    buttonUrl: buttonUrl,
    credentials: credentials
  });

  // Build clean plain text version (Crucial for spam filter pass)
  const textContent = `Hello ${recipientName || to.split('@')[0]},

${messageBody}

${credentials ? `CUSTOMER PORTAL CREDENTIALS:\nUsername: ${credentials.email}\nPassword: ${credentials.password}\n\n` : ''}${trackingCode ? `SHIPMENT DETAILS:\nTracking Code: ${trackingCode}\nStatus: ${status || 'IN TRANSIT'}\nRoute: ${origin || 'N/A'} -> ${destination || 'N/A'}\n` : ''}
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
