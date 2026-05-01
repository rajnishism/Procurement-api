import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Format Indian currency
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Build the HTML email body for an approval request.
 */
const buildApprovalEmail = ({ approverName, role, prNumber, department, totalValue, description, approveUrl, rejectUrl }) => {
  const amount = formatCurrency(totalValue);
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PR Approval Required</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
    <tr>
      <td>
        <table width="600" align="center" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a56db,#1e429f);padding:32px 40px;">
              <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                ✅ Approval Required
              </h1>
              <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;">
                Required Action: <strong style="color:#fff;">Approval as ${role}</strong>
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="margin:0;font-size:15px;color:#374151;">
                Dear <strong>${approverName}</strong>,
              </p>
              <p style="margin:12px 0 0;font-size:14px;color:#6b7280;line-height:1.6;">
                A Purchase Requisition has been submitted and requires your approval specifically in your role as <strong>${role}</strong>.
                Please review the details below.
              </p>
            </td>
          </tr>

          <!-- PR Details Card -->
          <tr>
            <td style="padding:24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                <tr>
                  <td colspan="2" style="background:#f1f5f9;padding:12px 20px;
                      font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">
                    PR Details
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px 4px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;">PR Number</td>
                  <td style="padding:14px 20px 4px;font-size:14px;font-weight:700;color:#111827;text-align:right;">${prNumber}</td>
                </tr>
                <tr>
                  <td style="padding:4px 20px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;border-top:1px solid #e5e7eb;">Department</td>
                  <td style="padding:4px 20px;font-size:14px;font-weight:600;color:#374151;text-align:right;border-top:1px solid #e5e7eb;">${department}</td>
                </tr>
                <tr>
                  <td style="padding:4px 20px 14px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;border-top:1px solid #e5e7eb;">Amount</td>
                  <td style="padding:4px 20px 14px;font-size:18px;font-weight:800;color:#1a56db;text-align:right;border-top:1px solid #e5e7eb;">${amount}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:0 20px 14px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;border-top:1px solid #e5e7eb;">
                    Description / Item
                    <p style="margin:6px 0 0;font-size:13px;color:#374151;font-weight:400;line-height:1.5;">${description}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Action Buttons -->
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="margin:0 0 16px;font-size:13px;color:#6b7280;">
                Click either button below to review and submit your decision:
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:12px;">
                    <a href="${approveUrl}"
                       style="display:inline-block;background:#059669;color:#fff;text-decoration:none;
                              padding:14px 28px;border-radius:8px;font-weight:700;font-size:14px;
                              letter-spacing:0.3px;">
                      ✅ Approve
                    </a>
                  </td>
                  <td>
                    <a href="${rejectUrl}"
                       style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;
                              padding:14px 28px;border-radius:8px;font-weight:700;font-size:14px;
                              letter-spacing:0.3px;">
                      ❌ Reject
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">
                Or copy this link into your browser:<br>
                <a href="${approveUrl}" style="color:#1a56db;font-size:11px;word-break:break-all;">${approveUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 40px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                This email was sent by the Procurement Management System. If you believe
                you received this in error, please ignore it. Do not share this link with others.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
};

/**
 * Send an approval request email to one approver.
 * @param {object} params
 * @param {string} params.approverName
 * @param {string} params.approverEmail
 * @param {string} params.prNumber
 * @param {string} params.department
 * @param {number} params.totalValue
 * @param {string} params.description
 * @param {string} params.token - the PrApproval token
 * @param {Array<object>} [params.attachments=[]] - Optional array of attachments for the email
 */
export const sendApprovalEmail = async ({ approverName, approverEmail, role, prNumber, department, totalValue, description, token, attachments = [] }) => {
  const baseUrl = `${process.env.APP_URL}/pr/action`;
  const approveUrl = `${baseUrl}?token=${token}&decision=approve`;
  const rejectUrl = `${baseUrl}?token=${token}&decision=reject`;

  const html = buildApprovalEmail({
    approverName,
    role,
    prNumber,
    department,
    totalValue,
    description,
    approveUrl,
    rejectUrl,
  });

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: approverEmail,
    subject: `[Approval Required: ${role}] PR ${prNumber}`,
    html,
    attachments,
  });

  console.log(`[Email] Sent to ${approverEmail}: ${info.messageId}`);
  return info;
};

/**
 * Send a confirmation request email to the Indentor once the PR is created.
 * They must click 'Confirm' before it goes to Stage 1.
 */
export const sendIndentorConfirmationEmail = async ({ indentorName, indentorEmail, prNumber, department, totalValue, description, token, attachments = [] }) => {
  const amount = formatCurrency(totalValue);
  const baseUrl = `${process.env.APP_URL}/pr/action`;
  const approveUrl = `${baseUrl}?token=${token}&decision=approve`;
  const rejectUrl = `${baseUrl}?token=${token}&decision=reject`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Direct Action Required: PR Initiation</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
    <tr><td>
      <table width="600" align="center" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#10b981,#059669);padding:32px 40px;">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">📝 Verify PR Generation</h1>
            <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;">Action Required: Please confirm your request as the Indentor</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px 0;">
            <p style="margin:0;font-size:15px;color:#374151;">Dear <strong>${indentorName}</strong>,</p>
            <p style="margin:12px 0 0;font-size:14px;color:#6b7280;line-height:1.6;">
              A Purchase Requisition with you as the <strong>indentor</strong> has been generated by the system.
              Please confirm that these details are correct to proceed with the official approval workflow.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
              <tr><td colspan="2" style="background:#f1f5f9;padding:12px 20px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Requisition Summary</td></tr>
              <tr>
                <td style="padding:14px 20px 4px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;">Proposed ID</td>
                <td style="padding:14px 20px 4px;font-size:14px;font-weight:700;color:#111827;text-align:right;">${prNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 20px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;border-top:1px solid #e5e7eb;">Department</td>
                <td style="padding:4px 20px;font-size:14px;font-weight:600;color:#374151;text-align:right;border-top:1px solid #e5e7eb;">${department}</td>
              </tr>
              <tr>
                <td style="padding:4px 20px 14px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;border-top:1px solid #e5e7eb;">Estimated Value</td>
                <td style="padding:4px 20px 14px;font-size:18px;font-weight:800;color:#059669;text-align:right;border-top:1px solid #e5e7eb;">${amount}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 32px;">
            <p style="margin:0 0 16px;font-size:13px;color:#6b7280;">Click confirm to initiate the Stage 1 review:</p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:12px;">
                  <a href="${approveUrl}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;font-size:14px;">✅ Confirm & Send</a>
                </td>
                <td>
                  <a href="${rejectUrl}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;font-size:14px;">❌ Cancel</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 40px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">Note: Approval Stage 1 notifications will only be sent after your confirmation.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const info = await transporter.sendMail({ from: process.env.SMTP_FROM, to: indentorEmail, subject: `[Action Required] Confirm PR Generation: ${prNumber}`, html, attachments });
  console.log(`[Email] Indentor verification sent to ${indentorEmail}: ${info.messageId}`);
  return info;
};

/**
 * Send a cancellation notice to an approver when the PR is deleted.
 */
export const sendCancellationEmail = async ({ approverName, approverEmail, prNumber, department, totalValue, description, reason }) => {
  const amount = formatCurrency(totalValue);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>PR Cancelled</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
    <tr><td>
      <table width="600" align="center" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#6b7280,#374151);padding:32px 40px;">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">🗑️ PR Cancelled</h1>
            <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;">A Purchase Requisition you were asked to approve has been withdrawn</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px 0;">
            <p style="margin:0;font-size:15px;color:#374151;">Dear <strong>${approverName}</strong>,</p>
            <p style="margin:12px 0 0;font-size:14px;color:#6b7280;line-height:1.6;">
              The following PR has been <strong>cancelled / withdrawn</strong> by the procurement team.
              Your approval is no longer required, and any previous email links for this PR are now inactive.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
              <tr><td colspan="2" style="background:#f1f5f9;padding:12px 20px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Cancelled PR Details</td></tr>
              <tr>
                <td style="padding:14px 20px 4px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;">PR Number</td>
                <td style="padding:14px 20px 4px;font-size:14px;font-weight:700;color:#111827;text-align:right;">${prNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 20px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;border-top:1px solid #e5e7eb;">Department</td>
                <td style="padding:4px 20px;font-size:14px;font-weight:600;color:#374151;text-align:right;border-top:1px solid #e5e7eb;">${department}</td>
              </tr>
              <tr>
                <td style="padding:4px 20px 14px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;border-top:1px solid #e5e7eb;">Amount</td>
                <td style="padding:4px 20px 14px;font-size:18px;font-weight:800;color:#6b7280;text-align:right;border-top:1px solid #e5e7eb;">${amount}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding:0 20px 14px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;border-top:1px solid #e5e7eb;">
                  Reason for Cancellation
                  <p style="margin:6px 0 0;font-size:13px;color:#dc2626;font-weight:600;line-height:1.5;">${reason || 'Not specified'}</p>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding:0 20px 14px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;border-top:1px solid #e5e7eb;">
                  Description
                  <p style="margin:6px 0 0;font-size:13px;color:#374151;font-weight:400;line-height:1.5;">${description}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 40px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">No further action is required. This is an automated notification from the Procurement Management System.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: approverEmail,
    subject: `PR ${prNumber} — Cancelled / Withdrawn`,
    html,
  });

  console.log(`[Email] Cancellation sent to ${approverEmail}: ${info.messageId}`);
  return info;
};

/**
 * Send an RFQ invitation email to a vendor with a secure portal link.
 */
export const sendRFQEmail = async ({ vendorName, vendorEmail, rfqNumber, rfqTitle, rfqDescription, deadline, prNumber, portalUrl }) => {
  const deadlineStr = new Date(deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>RFQ Invitation</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
    <tr><td>
      <table width="600" align="center" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px 40px;">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">📋 Request for Quotation</h1>
            <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;">You are invited to submit a quotation</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px 0;">
            <p style="margin:0;font-size:15px;color:#374151;">Dear <strong>${vendorName}</strong>,</p>
            <p style="margin:12px 0 0;font-size:14px;color:#6b7280;line-height:1.6;">
              We invite you to submit a quotation for the following procurement requirement.
              Please click the link below to access the secure vendor portal and submit your best offer.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
              <tr><td colspan="2" style="background:#f1f5f9;padding:12px 20px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">RFQ Details</td></tr>
              <tr>
                <td style="padding:14px 20px 4px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;">RFQ Number</td>
                <td style="padding:14px 20px 4px;font-size:14px;font-weight:700;color:#111827;text-align:right;">${rfqNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 20px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;border-top:1px solid #e5e7eb;">PR Reference</td>
                <td style="padding:4px 20px;font-size:14px;font-weight:600;color:#374151;text-align:right;border-top:1px solid #e5e7eb;">${prNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 20px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;border-top:1px solid #e5e7eb;">Deadline</td>
                <td style="padding:4px 20px;font-size:14px;font-weight:800;color:#dc2626;text-align:right;border-top:1px solid #e5e7eb;">${deadlineStr}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding:0 20px 14px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;border-top:1px solid #e5e7eb;">
                  Subject
                  <p style="margin:6px 0 0;font-size:13px;color:#374151;font-weight:400;line-height:1.5;">${rfqTitle}${rfqDescription ? '<br><span style="color:#6b7280">' + rfqDescription + '</span>' : ''}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 32px;text-align:center;">
            <a href="${portalUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-decoration:none;
                      padding:16px 40px;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.3px;
                      box-shadow:0 4px 12px rgba(124,58,237,0.3);">
              📝 Submit Quotation
            </a>
            <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">
              Or copy this link: <a href="${portalUrl}" style="color:#7c3aed;word-break:break-all;">${portalUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 40px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              This link is unique to your organisation. Do not share it. Quotations must be submitted before the deadline.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: vendorEmail,
    subject: `RFQ ${rfqNumber} — Quotation Invitation`,
    html,
  });

  console.log(`[Email] RFQ sent to ${vendorEmail}: ${info.messageId}`);
  return info;
};

/**
 * Notify specific address that an AI-driven PR has been generated and saved.
 */
export const sendAiPrGeneratedNotification = async ({ prNumber, department, totalValue, mainItemDescription, pdfPath }) => {
  const amount = formatCurrency(totalValue);
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px;">
      <h2 style="color: #4f46e5;">🤖 AI PR Generated & Saved</h2>
      <p>A new Purchase Requisition has been automatically generated from a quotation and saved to the tracking list.</p>
      <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>PR Number:</strong> ${prNumber}</p>
        <p><strong>Department:</strong> ${department}</p>
        <p><strong>Grand Total:</strong> ${amount}</p>
        <p><strong>Main Item:</strong> ${mainItemDescription}</p>
      </div>
      <p style="font-size: 12px; color: #6b7280;">Reference Original Quote: ${pdfPath || 'N/A'}</p>
      <p>Please review the PR in the tracking dashboard for final approval.</p>
    </div>
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: 'rajnishism24@gmail.com',
      subject: `[AI Alert] PR ${prNumber} Generated`,
      html,
    });
    console.log(`[Email] AI PR Notification sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('[Email] AI PR Notification failed:', error);
  }
};

/**
 * Acknowledge a vendor's quotation submission.
 */
export const sendVendorQuoteAcknowledgement = async ({ vendorEmail, vendorName, rfqNumber, rfqTitle }) => {
  const html = `
    <div style="font-family:sans-serif;padding:24px;max-width:600px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#1a56db;">📨 Quotation Received</h2>
      <p>Dear <strong>${vendorName}</strong>,</p>
      <p>We have successfully received your quotation for <strong>${rfqTitle}</strong> (RFQ: <strong>${rfqNumber}</strong>).</p>
      <p>Our technical and procurement team will review your submission. You will be notified of any further action.</p>
      <p style="font-size:12px;color:#6b7280;margin-top:24px;">Please do not reply to this email. Contact your procurement representative for queries.</p>
    </div>
  `.trim();
  const info = await transporter.sendMail({ from: process.env.SMTP_FROM, to: vendorEmail, subject: `Quotation Received – RFQ ${rfqNumber}`, html });
  console.log(`[Email] Quote acknowledgement sent to ${vendorEmail}: ${info.messageId}`);
  return info;
};

/**
 * Request technical review from technical department.
 */
export const sendTechnicalReviewRequest = async ({ toEmail, rfqNumber, rfqTitle, prNumber, quotations }) => {
  const rows = quotations.map((q, i) =>
    `<tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'}">
      <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-weight:600">${q.vendorName}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;">${formatCurrency(q.totalAmount)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;">${q.deliveryDays || '—'} days</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${q.notes || '—'}</td>
    </tr>`
  ).join('');
  const html = `
    <div style="font-family:sans-serif;padding:24px;max-width:700px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#1a56db;">🔬 Technical Review Required</h2>
      <p>All vendor quotations for <strong>${rfqTitle}</strong> (RFQ: <strong>${rfqNumber}</strong>, PR: <strong>${prNumber}</strong>) have been collected.</p>
      <p>Please review each vendor's submission and submit your technical observations in the system.</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        <thead><tr style="background:#e0e7ff;">
          <th style="padding:10px 14px;text-align:left;">Vendor</th>
          <th style="padding:10px 14px;text-align:left;">Total Amount</th>
          <th style="padding:10px 14px;text-align:left;">Delivery Days</th>
          <th style="padding:10px 14px;text-align:left;">Notes</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:20px;color:#6b7280;font-size:12px;">Login to the Procurement System to submit your technical review.</p>
    </div>
  `.trim();
  const info = await transporter.sendMail({ from: process.env.SMTP_FROM, to: toEmail, subject: `Technical Review Required – RFQ ${rfqNumber}`, html });
  console.log(`[Email] Technical review request sent to ${toEmail}: ${info.messageId}`);
  return info;
};

/**
 * Send PO issuance confirmation to selected vendor.
 */
export const sendPoIssuanceEmail = async ({ vendorEmail, vendorName, poNumber, prNumber, totalAmount }) => {
  const amount = formatCurrency(totalAmount);
  const html = `
    <div style="font-family:sans-serif;padding:24px;max-width:600px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#059669;">📦 Purchase Order Issued</h2>
      <p>Dear <strong>${vendorName}</strong>,</p>
      <p>A Purchase Order has been formally issued to you.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:8px;margin:16px 0;">
        <p style="margin:4px 0;"><strong>PO Number:</strong> ${poNumber}</p>
        <p style="margin:4px 0;"><strong>PR Reference:</strong> ${prNumber}</p>
        <p style="margin:4px 0;"><strong>Total Amount:</strong> ${amount}</p>
      </div>
      <p>Please acknowledge receipt and proceed with delivery as per agreed terms.</p>
    </div>
  `.trim();
  const info = await transporter.sendMail({ from: process.env.SMTP_FROM, to: vendorEmail, subject: `Purchase Order ${poNumber} – Issued`, html });
  console.log(`[Email] PO issuance email sent to ${vendorEmail}: ${info.messageId}`);
  return info;
};

/**
 * Send PO approval request email (mirrors PR approval pattern).
 */
export const sendPoApprovalEmail = async ({ approverName, approverEmail, poNumber, vendorName, totalAmount, prNumber, token }) => {
  const amount = formatCurrency(totalAmount);
  const baseUrl = `${process.env.APP_URL}/po/action`;
  const approveUrl = `${baseUrl}?token=${token}&decision=approve`;
  const rejectUrl = `${baseUrl}?token=${token}&decision=reject`;
  const html = `
    <div style="font-family:sans-serif;padding:24px;max-width:600px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#1a56db;">✅ PO Approval Required</h2>
      <p>Dear <strong>${approverName}</strong>, the following PO requires your authorization:</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;padding:16px;border-radius:8px;margin:16px 0;">
        <p style="margin:4px 0;"><strong>PO Number:</strong> ${poNumber}</p>
        <p style="margin:4px 0;"><strong>PR Reference:</strong> ${prNumber}</p>
        <p style="margin:4px 0;"><strong>Vendor:</strong> ${vendorName}</p>
        <p style="margin:4px 0;"><strong>Total Amount:</strong> ${amount}</p>
      </div>
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="padding-right:12px;"><a href="${approveUrl}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;">✅ Approve PO</a></td>
        <td><a href="${rejectUrl}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;">❌ Reject PO</a></td>
      </tr></table>
    </div>
  `.trim();
  const info = await transporter.sendMail({ from: process.env.SMTP_FROM, to: approverEmail, subject: `PO ${poNumber} — Approval Required`, html });
  console.log(`[Email] PO Approval sent to ${approverEmail}: ${info.messageId}`);
  return info;
};

/**
 * Send auto-reply to user who submitted a bug/feedback
 */
export const sendFeedbackConfirmationEmail = async ({ userEmail, userName, type, ticketId }) => {
  const html = `
    <div style="font-family:sans-serif;padding:24px;max-width:600px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#059669;">✅ ${type === 'BUG' ? 'Bug Report' : 'Feedback'} Received</h2>
      <p>Dear <strong>${userName || 'Valued User'}</strong>,</p>
      <p>Thank you for submitting your ${type.toLowerCase()}. We have successfully recorded it in our system.</p>
      <p>Your tracking ID is: <strong>${ticketId}</strong>.</p>
      <p>Our support and engineering team will review it shortly. We appreciate your effort in helping us improve the system.</p>
    </div>
  `.trim();
  const info = await transporter.sendMail({ from: process.env.SMTP_FROM, to: userEmail, subject: `We received your ${type.toLowerCase()} (ID: ${ticketId})`, html });
  console.log(`[Email] Feedback confirmation sent to ${userEmail}: ${info.messageId}`);
  return info;
};

/**
 * Send notification to system admins about new feedback/bug
 */
export const sendFeedbackNotificationToAdminEmail = async ({ type, subject, description, submittedBy, priority, ticketId }) => {
  // Hardcode admin email for now, or use IT support alias
  const adminEmail = 'rajnishism24@gmail.com'; 
  const html = `
    <div style="font-family:sans-serif;padding:24px;max-width:600px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#dc2626;">🚨 New System ${type} Logged</h2>
      <p>A new support ticket has been created by <strong>${submittedBy}</strong>.</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;padding:16px;border-radius:8px;margin:16px 0;">
        <p style="margin:4px 0;"><strong>Ticket ID:</strong> ${ticketId}</p>
        <p style="margin:4px 0;"><strong>Type:</strong> ${type}</p>
        <p style="margin:4px 0;"><strong>Priority:</strong> ${priority || 'NORMAL'}</p>
        <p style="margin:4px 0;"><strong>Subject:</strong> ${subject}</p>
      </div>
      <p style="color:#4b5563;">${description}</p>
    </div>
  `.trim();
  const info = await transporter.sendMail({ from: process.env.SMTP_FROM, to: adminEmail, subject: `[${priority || 'NORMAL'}] New ${type}: ${subject}`, html });
  console.log(`[Email] Feedback alert sent to admin: ${info.messageId}`);
  return info;
};

/**
 * Send an email for a generic in-app approval request (e.g., NFA)
 */
export const sendInAppApprovalEmail = async ({ approverName, approverEmail, requestType, requestId, title, appUrl }) => {
  const html = `
    <div style="font-family:sans-serif;padding:24px;max-width:600px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#1a56db;">✅ Approval Required</h2>
      <p>Dear <strong>${approverName}</strong>, the following <strong>${requestType}</strong> requires your authorization:</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;padding:16px;border-radius:8px;margin:16px 0;">
        <p style="margin:4px 0;"><strong>Request ID:</strong> ${requestId}</p>
        <p style="margin:4px 0;"><strong>Title:</strong> ${title}</p>
      </div>
      <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">
        Please log in to the Procurement Management System to review and provide your approval.
      </p>
      ${appUrl ? `<p style="margin-top: 20px;"><a href="${appUrl}" style="display:inline-block;background:#1a56db;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;">View Request</a></p>` : ''}
    </div>
  `.trim();

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: approverEmail,
    subject: `Approval Required: ${requestType} ${requestId}`,
    html,
  });

  console.log(`[Email] In-App Approval request sent to ${approverEmail}: ${info.messageId}`);
  return info;
};

/**
 * Send a password reset OTP to the user.
 */
export const sendOtpEmail = async ({ userName, userEmail, otp }) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Password Reset OTP</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
    <tr><td>
      <table width="600" align="center" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a56db,#1e429f);padding:32px 40px;">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
              🔐 Password Reset
            </h1>
            <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;">
              A reset was requested for your Procurement OS account
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px 0;">
            <p style="margin:0;font-size:15px;color:#374151;">Dear <strong>${userName}</strong>,</p>
            <p style="margin:12px 0 0;font-size:14px;color:#6b7280;line-height:1.6;">
              We received a request to reset your password. Use the OTP code below to proceed.
              This code is valid for <strong>10 minutes</strong>.
            </p>
          </td>
        </tr>

        <!-- OTP Block -->
        <tr>
          <td style="padding:32px 40px;">
            <div style="background:#f8fafc;border:2px dashed #1a56db;border-radius:12px;padding:24px;text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:2px;">
                Your One-Time Password
              </p>
              <p style="margin:0;font-size:48px;font-weight:900;letter-spacing:12px;color:#1a56db;font-family:monospace;">
                ${otp}
              </p>
              <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">
                ⏱ Expires in 10 minutes
              </p>
            </div>
          </td>
        </tr>

        <!-- Warning -->
        <tr>
          <td style="padding:0 40px 32px;">
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;">
              <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
                ⚠️ <strong>Did not request this?</strong> If you did not request a password reset,
                please ignore this email. Your account remains secure.
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 40px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              This is an automated message from Procurement OS. Do not reply to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: userEmail,
    subject: `Your Password Reset OTP — ${otp}`,
    html,
  });

  console.log(`[Email] OTP sent to ${userEmail}: ${info.messageId}`);
  return info;
};

export default { 
  sendApprovalEmail, 
  sendIndentorConfirmationEmail,
  sendCancellationEmail, 
  sendRFQEmail, 
  sendAiPrGeneratedNotification, 
  sendVendorQuoteAcknowledgement, 
  sendTechnicalReviewRequest, 
  sendPoIssuanceEmail, 
  sendPoApprovalEmail,
  sendFeedbackConfirmationEmail,
  sendFeedbackNotificationToAdminEmail,
  sendInAppApprovalEmail,
  sendOtpEmail
};
