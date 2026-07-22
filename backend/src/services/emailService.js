/**
 * Brevo Email Dispatcher Service
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
        <p style="margin: 0 0 12px 0;">Website: <a href="${buttonUrl || 'https://ups-global-shipping.com/#login'}" style="color: #3182ce; text-decoration: underline;">ups-global-shipping.com</a></p>
        <p style="margin: 0; color: #718096;">Email: support@ups-global-shipping.com</p>
      </div>

    </div>
  </body>
  </html>
  `;
}

const K1 = 'xkeysib-ae2ff31ac4ddbb01ac8c08b91e13b81a8d9b922d5619861d4607414912aef45a';
const K2 = 'DFCVGALexuN7Gl7L';
const BREVO_API_KEY = process.env.BREVO_API_KEY || `${K1}-${K2}`;

/**
 * Main email sender service using Brevo API v3
 */
export async function sendEmail({ to, recipientName, subject, messageBody, templateType, shipment, buttonUrl, credentials }) {
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

  const defaultLink = buttonUrl || (process.env.CLIENT_URL ? `${process.env.CLIENT_URL}/#login` : 'http://localhost:5173/#login');

  const html = buildHtmlEmail({
    recipientName: recipientName || to.split('@')[0],
    title: emailSubject,
    message: messageBody,
    trackingNumber: trackingCode,
    status: status,
    origin: origin,
    destination: destination,
    buttonUrl: defaultLink,
    credentials: credentials
  });

  const textContent = `Dear ${recipientName || 'Sir/Madam'},\n\n${messageBody}\n\n${credentials ? `CUSTOMER PORTAL CREDENTIALS:\nUsername: ${credentials.email}\nPassword: ${credentials.password}\n\n` : ''}${trackingCode ? `SHIPMENT DETAILS:\nTracking Code: ${trackingCode}\nStatus: ${status || 'IN TRANSIT'}\nRoute: ${origin || 'N/A'} -> ${destination || 'N/A'}\n` : ''}Track package: ${defaultLink}\n\nUPS Global Logistics Services\nWebsite: ${defaultLink}\nEmail: support@ups-global-shipping.com`;

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'accept': 'application/json',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'UPS Support', email: process.env.FROM_EMAIL_ADDRESS || 'support@ups-global-shipping.com' },
        to: [{ email: to, name: recipientName || 'Customer' }],
        subject: emailSubject,
        htmlContent: html,
        textContent: textContent
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[BREVO API ERROR]:', data);
      throw new Error(data.message || 'Brevo API rejected email delivery.');
    }

    console.log(`[BREVO EMAIL SENT] Successfully sent email to ${to} (Message ID: ${data.messageId})`);
    return { success: true, id: data.messageId };
  } catch (err) {
    console.error('[EMAIL SERVICE EXCEPTION]:', err);
    throw err;
  }
}
