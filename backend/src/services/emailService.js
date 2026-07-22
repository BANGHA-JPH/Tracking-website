import { Resend } from 'resend';

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
};

/**
 * Clean corporate email layout matching Dukascopy Bank reference design
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
  <body style="margin: 0; padding: 30px 15px; background-color: #eef2f5; font-family: Arial, Helvetica, sans-serif; color: #2d3748; line-height: 1.6;">
    <div style="max-width: 580px; margin: 0 auto;">
      
      <!-- Top Brand Logo -->
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 28px; font-weight: 900; color: #351C15; letter-spacing: 1px;">UPS</span>
        <span style="font-size: 24px; font-weight: 700; color: #d89600; margin-left: 8px; text-transform: uppercase;">LOGISTICS</span>
      </div>

      <!-- Main Content Card 1 -->
      <div style="background-color: #ffffff; border-radius: 4px; padding: 32px; margin-bottom: 16px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        
        <p style="font-size: 15px; color: #2d3748; margin-top: 0; margin-bottom: 18px; font-weight: 600;">
          Dear ${recipientName || 'Sir/Madam'},
        </p>

        <div style="font-size: 15px; color: #4a5568; line-height: 1.6; margin-bottom: 24px;">
          ${message.replace(/\n/g, '<br/>')}
        </div>

        ${credentials ? `
        <!-- Credentials Summary -->
        <div style="background-color: #f7fafc; border-left: 4px solid #351C15; border-radius: 2px; padding: 16px; margin-bottom: 24px; font-size: 14px;">
          <div style="font-weight: 700; color: #351C15; margin-bottom: 8px; text-transform: uppercase; font-size: 13px;">Customer Portal Credentials</div>
          <div style="margin-bottom: 6px; color: #2d3748;"><strong>Username / Email:</strong> <span style="font-family: monospace;">${credentials.email}</span></div>
          <div style="color: #2d3748;"><strong>Password:</strong> <span style="font-family: monospace; font-weight: 700; background: #fff3c4; padding: 2px 6px; border-radius: 2px; color: #351C15;">${credentials.password}</span></div>
        </div>
        ` : ''}

        ${trackingNumber ? `
        <!-- Tracking Summary -->
        <div style="background-color: #f7fafc; border: 1px solid #edf2f7; border-radius: 2px; padding: 16px; margin-bottom: 24px; font-size: 14px;">
          <div style="margin-bottom: 6px; color: #2d3748;"><strong>Tracking ID:</strong> <span style="font-family: monospace; font-weight: 700; color: #351C15;">${trackingNumber}</span></div>
          ${status ? `<div style="margin-bottom: 6px; color: #2d3748;"><strong>Status:</strong> ${status}</div>` : ''}
          ${origin || destination ? `<div style="color: #2d3748;"><strong>Route:</strong> ${origin || 'N/A'} to ${destination || 'N/A'}</div>` : ''}
        </div>
        ` : ''}

        ${buttonUrl ? `
        <!-- Action Link Button -->
        <div style="margin-top: 24px;">
          <a href="${buttonUrl}" style="color: #351C15; font-weight: 700; font-size: 15px; text-decoration: underline;">
            Track Package Online &rarr;
          </a>
        </div>
        ` : ''}

      </div>

      <!-- Contact Footer Card 2 -->
      <div style="background-color: #ffffff; border-radius: 4px; padding: 24px; border: 1px solid #e2e8f0; font-size: 13px; color: #4a5568; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <p style="margin: 0 0 6px 0; font-weight: 700; color: #2d3748; font-size: 14px;">UPS Global Logistics Services</p>
        <p style="margin: 0 0 4px 0;">Official Transactional Notification</p>
        <p style="margin: 0 0 12px 0;">Website: <a href="https://ups-global-shipping.com" style="color: #3182ce; text-decoration: underline;">ups-global-shipping.com</a></p>
        <p style="margin: 0; color: #718096;">Email: support@ups-global-shipping.com</p>
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

  // Clean plain text version (No Emojis)
  const textContent = `Dear ${recipientName || 'Sir/Madam'},

${messageBody}

${credentials ? `CUSTOMER PORTAL CREDENTIALS:\nUsername: ${credentials.email}\nPassword: ${credentials.password}\n\n` : ''}${trackingCode ? `SHIPMENT DETAILS:\nTracking Code: ${trackingCode}\nStatus: ${status || 'IN TRANSIT'}\nRoute: ${origin || 'N/A'} -> ${destination || 'N/A'}\n` : ''}
Track package: ${buttonUrl || 'https://ups-global-shipping.com'}

UPS Global Logistics Services
Website: https://ups-global-shipping.com
Email: support@ups-global-shipping.com`;

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
