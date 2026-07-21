import { Resend } from 'resend';

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
};

/**
 * Generate responsive UPS HTML Email Template
 */
function buildHtmlEmail({ recipientName, title, message, trackingNumber, status, origin, destination, buttonUrl }) {
  const brandColor = '#351C15'; // UPS Dark Brown
  const accentColor = '#FFB500'; // UPS Gold/Yellow

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333333;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f8; padding: 30px 0;">
      <tr>
        <td align="center">
          <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            
            <!-- Header Bar -->
            <tr>
              <td style="background-color: ${brandColor}; padding: 20px 30px; text-align: left;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td>
                      <span style="font-size: 24px; font-weight: 800; color: ${accentColor}; letter-spacing: 1px;">UPS</span>
                      <span style="font-size: 16px; font-weight: 600; color: #ffffff; margin-left: 8px; text-transform: uppercase;">Global Logistics</span>
                    </td>
                    <td align="right">
                      <span style="font-size: 12px; color: #d1c7bd; text-transform: uppercase; letter-spacing: 0.5px;">Official Notification</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Title Banner -->
            <tr>
              <td style="background-color: #fcf8f2; padding: 25px 30px; border-bottom: 2px solid ${accentColor};">
                <h1 style="margin: 0; font-size: 20px; color: ${brandColor}; font-weight: 700;">${title}</h1>
              </td>
            </tr>

            <!-- Main Body Content -->
            <tr>
              <td style="padding: 30px;">
                <p style="font-size: 15px; line-height: 1.6; color: #444444; margin-top: 0;">
                  Hello <strong>${recipientName || 'Valued Customer'}</strong>,
                </p>
                
                <div style="font-size: 15px; line-height: 1.6; color: #444444; margin-bottom: 25px;">
                  ${message.replace(/\n/g, '<br/>')}
                </div>

                ${trackingNumber ? `
                <!-- Shipment Details Card -->
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding-bottom: 10px;">
                        <span style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Tracking Code</span><br/>
                        <strong style="font-size: 18px; color: ${brandColor}; letter-spacing: 0.5px;">${trackingNumber}</strong>
                      </td>
                      <td align="right" style="padding-bottom: 10px;">
                        <span style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Status</span><br/>
                        <span style="display: inline-block; background-color: ${brandColor}; color: ${accentColor}; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 20px; text-transform: uppercase;">
                          ${status || 'IN TRANSIT'}
                        </span>
                      </td>
                    </tr>
                    ${origin || destination ? `
                    <tr>
                      <td colspan="2" style="border-top: 1px dashed #cbd5e1; padding-top: 12px; font-size: 13px; color: #475569;">
                        <strong>Route:</strong> ${origin || 'N/A'} &rarr; ${destination || 'N/A'}
                      </td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
                ` : ''}

                ${buttonUrl ? `
                <!-- Call To Action Button -->
                <div style="text-align: center; margin: 30px 0 10px 0;">
                  <a href="${buttonUrl}" style="background-color: ${accentColor}; color: ${brandColor}; font-size: 15px; font-weight: 700; text-decoration: none; padding: 12px 30px; border-radius: 6px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    Track Live Package &rarr;
                  </a>
                </div>
                ` : ''}
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f1f5f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                <p style="margin: 0 0 6px 0;">UPS Logistics Services &bull; Global Parcel Delivery Network</p>
                <p style="margin: 0;">This is an automated notification sent directly from the UPS Admin Portal.</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
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

  // Preset Template adjustments
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
  const textContent = `UPS Global Logistics - Official Notification

Hello ${recipientName || to.split('@')[0]},

${messageBody}

${trackingCode ? `Tracking Code: ${trackingCode}\nStatus: ${status || 'IN TRANSIT'}\nRoute: ${origin || 'N/A'} -> ${destination || 'N/A'}\n` : ''}
Track package live: ${buttonUrl || 'https://ups-global-shipping.com'}

UPS Logistics Services • Global Parcel Delivery Network`;

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
