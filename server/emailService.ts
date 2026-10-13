/**
 * Email Service Module
 * 
 * Handles transactional email delivery through Brevo.
 * Provides templates for various email types (project sharing, notifications, etc.)
 * Includes admin copy functionality to forward all emails to admin for monitoring.
 * 
 * Main Classes & Functions:
 * - EmailService: Main email service class
 *   - sendEmail(template): Sends email to recipient and optionally admin
 *   - createProjectShareEmail(...): Creates formatted email for project sharing
 *   - createOpportunityEmail(...): Creates email for opportunity notifications
 *   - Various other email template methods
 * - EmailTemplate interface: Defines email structure (to, subject, text, html)
 * 
 * Features:
 * - Sends emails to primary recipient
 * - Automatically forwards copy to admin email for auditing
 * - Uses Brevo exclusively; there is no provider fallback
 * - HTML and text email templates
 * 
 * Environment Variables Required:
 * - BREVO_API_KEY: Brevo API key
 * - BREVO_FROM_EMAIL: Verified sender email address in Brevo
 * - BREVO_FROM_NAME: Optional sender name (defaults to ScholarScape)
 */

if (!process.env.BREVO_API_KEY || !process.env.BREVO_FROM_EMAIL) {
  console.warn("BREVO_API_KEY or BREVO_FROM_EMAIL not set - email delivery is disabled");
}

export interface EmailTemplate {
  to: string;
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

export class EmailService {
  private fromEmail = process.env.BREVO_FROM_EMAIL?.trim() || '';
  private fromName = process.env.BREVO_FROM_NAME?.trim() || 'ScholarScape';
  private adminEmail = process.env.EMAIL_ADMIN || 'hellorblend@gmail.com';

  private async sendWithBrevo(template: EmailTemplate, apiKey: string): Promise<boolean> {
    if (!this.fromEmail) return false;

    const messages = [
      {
        sender: { name: this.fromName, email: this.fromEmail },
        to: [{ email: template.to }],
        subject: template.subject,
        textContent: template.text,
        htmlContent: template.html,
      },
    ];
    const normalizedSubject = template.subject.toLowerCase();
    const isAuthenticationEmail = normalizedSubject.includes('password') || normalizedSubject.includes('email');
    if (this.adminEmail && !isAuthenticationEmail) {
      messages.push({
        sender: { name: this.fromName, email: this.fromEmail },
        to: [{ email: this.adminEmail }],
        subject: `[ADMIN] ${template.subject}`,
        textContent: `Admin notification for ResearchCollab activity:\n\nOriginal recipient: ${template.to}\n\n${template.text}`,
        htmlContent: `<p><strong>Original recipient:</strong> ${template.to}</p>${template.html}`,
      });
    }

    for (const message of messages) {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
      if (!response.ok) {
        const details = await response.text();
        throw new Error(`Brevo rejected the email (${response.status}): ${details}`);
      }
    }

    console.log('Email sent successfully via Brevo to:', template.to);
    return true;
  }

  async sendEmail(template: EmailTemplate): Promise<boolean> {
    const brevoApiKey = process.env.BREVO_API_KEY?.trim();
    if (!brevoApiKey || !this.fromEmail) {
      console.error('Email was not sent because Brevo credentials are not configured:', {
        subject: template.subject,
        recipient: template.to,
      });
      return false;
    }

    try {
      return await this.sendWithBrevo(template, brevoApiKey);
    } catch (error) {
      console.error('Failed to send email via Brevo:', error);
      return false;
    }
  }

  createPasswordResetEmail(recipientEmail: string, recipientName: string, resetUrl: string): EmailTemplate {
    const subject = 'Reset your ScholarScape password';
    const text = `Hi ${recipientName},\n\nUse this link to reset your ScholarScape password:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`;
    const html = `<p>Hi ${recipientName},</p><p>Use the link below to reset your ScholarScape password:</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>`;
    return { to: recipientEmail, subject, text, html };
  }

  createEmailVerificationEmail(recipientEmail: string, recipientName: string, verificationUrl: string): EmailTemplate {
    const subject = 'Verify your ScholarScape email';
    const text = `Hi ${recipientName},\n\nVerify your ScholarScape email address here:\n${verificationUrl}\n\nThis link expires in 24 hours.`;
    const html = `<p>Hi ${recipientName},</p><p>Verify your ScholarScape email address by clicking below:</p><p><a href="${verificationUrl}">Verify your email</a></p><p>This link expires in 24 hours.</p>`;
    return { to: recipientEmail, subject, text, html };
  }

  // Project sharing email
  createProjectShareEmail(
    recipientEmail: string,
    recipientName: string,
    projectTitle: string,
    sharedByName: string,
    message?: string,
    loginUrl: string = 'https://your-domain.replit.app'
  ): EmailTemplate {
    const subject = `${sharedByName} thinks you'd be interested in: ${projectTitle}`;
    
    const text = `
Hi ${recipientName},

${sharedByName} thought you might be interested in this research opportunity:

"${projectTitle}"

${message ? `${sharedByName} said: "${message}"` : ''}

You can check it out here: ${loginUrl}

This looks like it could be a great fit for your background. If you're interested, just click the link above to learn more and get in touch.

Cheers,
${sharedByName}
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .message { background: #f8f9fa; padding: 15px; border-left: 3px solid #007bff; margin: 15px 0; }
    a { color: #007bff; text-decoration: none; }
  </style>
</head>
<body>
  <p>Hi ${recipientName},</p>
  
  <p>${sharedByName} thought you might be interested in this research opportunity:</p>
  
  <h3>"${projectTitle}"</h3>
  
  ${message ? `<div class="message"><strong>${sharedByName} said:</strong><br>"${message}"</div>` : ''}
  
  <p>You can check it out here: <a href="${loginUrl}">View Project</a></p>
  
  <p>This looks like it could be a great fit for your background. If you're interested, just click the link above to learn more and get in touch.</p>
  
  <p>Cheers,<br>${sharedByName}</p>
</body>
</html>
    `.trim();

    return { to: recipientEmail, subject, text, html };
  }

  // Application status update email
  createApplicationStatusEmail(
    recipientEmail: string,
    recipientName: string,
    projectTitle: string,
    status: string,
    reviewNotes?: string,
    loginUrl: string = 'https://your-domain.replit.app'
  ): EmailTemplate {
    const statusText = status.replace('_', ' ');
    const subject = `Update on your application: ${projectTitle}`;
    
    const text = `
Hi ${recipientName},

I wanted to let you know that your application for "${projectTitle}" has been ${statusText}.

${reviewNotes ? `Here's what I noted: "${reviewNotes}"` : ''}

You can check your application status here: ${loginUrl}

${status === 'approved' ? 'Looking forward to working with you!' : 'Thank you for your interest in this project.'}

Best,
The Project Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .status { padding: 15px; border-radius: 5px; margin: 15px 0; }
    .approved { background: #d4edda; color: #155724; }
    .rejected, .ignored { background: #f8d7da; color: #721c24; }
    .under_review { background: #fff3cd; color: #856404; }
    a { color: #007bff; text-decoration: none; }
  </style>
</head>
<body>
  <p>Hi ${recipientName},</p>
  
  <p>I wanted to let you know that your application for "${projectTitle}" has been ${statusText}.</p>
  
  <div class="status ${status}">
    ${status === 'approved' ? '🎉 Congratulations! Your application has been approved.' : 
      status === 'rejected' || status === 'ignored' ? 'Thank you for your application. Unfortunately, we won\'t be moving forward at this time.' : 
      '⏳ Your application is currently under review.'}
  </div>
  
  ${reviewNotes ? `<p><strong>Note:</strong> "${reviewNotes}"</p>` : ''}
  
  <p>You can check your application status here: <a href="${loginUrl}">View Application</a></p>
  
  <p>${status === 'approved' ? 'Looking forward to working with you!' : 'Thank you for your interest in this project.'}</p>
  
  <p>Best,<br>The Project Team</p>
</body>
</html>
    `.trim();

    return { to: recipientEmail, subject, text, html };
  }

  // New application received email
  createNewApplicationEmail(
    recipientEmail: string,
    recipientName: string,
    projectTitle: string,
    applicantName: string,
    loginUrl: string = 'https://your-domain.replit.app'
  ): EmailTemplate {
    const subject = `${applicantName} applied to your project: ${projectTitle}`;
    
    const text = `
Hi ${recipientName},

Good news! ${applicantName} just applied to your research project "${projectTitle}".

You can review their application here: ${loginUrl}

Take a look at their background and see if they'd be a good fit for your team.

Best,
The Platform Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .highlight { background: #f8f9fa; padding: 15px; border-left: 3px solid #28a745; margin: 15px 0; }
    a { color: #007bff; text-decoration: none; }
  </style>
</head>
<body>
  <p>Hi ${recipientName},</p>
  
  <p>Good news! <strong>${applicantName}</strong> just applied to your research project:</p>
  
  <div class="highlight">
    <strong>"${projectTitle}"</strong>
  </div>
  
  <p>You can review their application here: <a href="${loginUrl}">Review Application</a></p>
  
  <p>Take a look at their background and see if they'd be a good fit for your team.</p>
  
  <p>Best,<br>The Platform Team</p>
</body>
</html>
    `.trim();

    return { to: recipientEmail, subject, text, html };
  }

  createProjectMessageEmail(
    recipientEmail: string,
    recipientName: string,
    senderName: string,
    projectTitle: string,
    message: string,
    conversationUrl: string,
  ): EmailTemplate {
    const subject = `${senderName} sent you a message about "${projectTitle}"`;
    const safeRecipientName = escapeHtml(recipientName);
    const safeSenderName = escapeHtml(senderName);
    const safeProjectTitle = escapeHtml(projectTitle);
    const safeMessage = escapeHtml(message);
    const safeConversationUrl = escapeHtml(conversationUrl);
    const text = `Hi ${recipientName},\n\n${senderName}, the researcher who posted "${projectTitle}", sent you a message:\n\n${message}\n\nReply in ScholarScape: ${conversationUrl}`;
    const html = `<p>Hi ${safeRecipientName},</p><p><strong>${safeSenderName}</strong>, the researcher who posted <strong>${safeProjectTitle}</strong>, sent you a message:</p><blockquote style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-left:3px solid #0d9488;white-space:pre-wrap">${safeMessage}</blockquote><p><a href="${safeConversationUrl}">Open the conversation in ScholarScape</a></p>`;
    return { to: recipientEmail, subject, text, html };
  }

  createProjectConnectionRequestEmail(
    recipientEmail: string,
    recipientName: string,
    senderName: string,
    projectTitle: string,
    requestMessage: string,
    connectionsUrl: string,
  ): EmailTemplate {
    const subject = `${senderName} wants to connect about "${projectTitle}"`;
    const safeRecipientName = escapeHtml(recipientName);
    const safeSenderName = escapeHtml(senderName);
    const safeProjectTitle = escapeHtml(projectTitle);
    const safeRequestMessage = escapeHtml(requestMessage);
    const safeConnectionsUrl = escapeHtml(connectionsUrl);
    const messageText = requestMessage ? `\n\nMessage: ${requestMessage}` : '';
    const messageHtml = requestMessage
      ? `<blockquote style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-left:3px solid #0d9488;white-space:pre-wrap">${safeRequestMessage}</blockquote>`
      : '';
    const text = `Hi ${recipientName},\n\n${senderName}, the researcher who posted "${projectTitle}", sent you a connection request.${messageText}\n\nReview the request in ScholarScape: ${connectionsUrl}`;
    const html = `<p>Hi ${safeRecipientName},</p><p><strong>${safeSenderName}</strong>, the researcher who posted <strong>${safeProjectTitle}</strong>, sent you a connection request.</p>${messageHtml}<p><a href="${safeConnectionsUrl}">Review the request in ScholarScape</a></p>`;
    return { to: recipientEmail, subject, text, html };
  }
}

export const emailService = new EmailService();