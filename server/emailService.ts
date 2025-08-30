import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY not set - email notifications will be disabled");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailTemplate {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export class EmailService {
  private fromEmail = 'noreply@researchcollab.com'; // You can change this to your verified domain
  private adminEmail = 'debanjanborthakur@gmail.com'; // Admin always gets notified

  async sendEmail(template: EmailTemplate): Promise<boolean> {
    if (!process.env.SENDGRID_API_KEY) {
      console.log('Email would be sent:', template.subject, 'to', template.to);
      return true; // Return true in development when no key is set
    }

    try {
      // Send to the recipient
      await mailService.send({
        to: template.to,
        from: this.fromEmail,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
      console.log('Email sent successfully to:', template.to);

      // Always send a copy to admin for monitoring
      const adminSubject = `[ADMIN] ${template.subject}`;
      const adminText = `Admin notification for ResearchCollab activity:\n\nOriginal recipient: ${template.to}\n\n${template.text}`;
      const adminHtml = `
        <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #007bff; margin-bottom: 20px;">
          <h3 style="color: #007bff; margin: 0;">Admin Notification</h3>
          <p style="margin: 5px 0;"><strong>Original recipient:</strong> ${template.to}</p>
          <p style="margin: 5px 0;"><strong>Activity:</strong> ${template.subject}</p>
        </div>
        ${template.html}
      `;

      await mailService.send({
        to: this.adminEmail,
        from: this.fromEmail,
        subject: adminSubject,
        text: adminText,
        html: adminHtml,
      });
      console.log('Admin notification sent to:', this.adminEmail);
      
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
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
    const subject = `${sharedByName} shared a research project with you: ${projectTitle}`;
    
    const text = `
Hi ${recipientName},

${sharedByName} has shared an exciting research project with you on ResearchCollab:

Project: ${projectTitle}

${message ? `Personal message: "${message}"` : ''}

Login to ResearchCollab to view the project details and apply:
${loginUrl}

Best regards,
The ResearchCollab Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ResearchCollab</h1>
    </div>
    <div class="content">
      <h2>New Project Shared With You!</h2>
      <p>Hi ${recipientName},</p>
      <p><strong>${sharedByName}</strong> has shared an exciting research project with you:</p>
      <h3>📊 ${projectTitle}</h3>
      ${message ? `<div style="background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 20px 0;"><strong>Personal message:</strong><br>"${message}"</div>` : ''}
      <p>Login to ResearchCollab to view the project details and apply:</p>
      <a href="${loginUrl}" class="button">View Project & Apply</a>
    </div>
    <div class="footer">
      <p>This email was sent from ResearchCollab - Connecting researchers worldwide</p>
    </div>
  </div>
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
    const statusText = status.replace('_', ' ').toUpperCase();
    const subject = `Application ${statusText}: ${projectTitle}`;
    
    const text = `
Hi ${recipientName},

Your application for the research project "${projectTitle}" has been ${status.replace('_', ' ')}.

${reviewNotes ? `Review notes: ${reviewNotes}` : ''}

Login to ResearchCollab to view your application status:
${loginUrl}

Best regards,
The ResearchCollab Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .status-approved { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; }
    .status-rejected { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; }
    .status-under_review { background: #fff3cd; color: #856404; padding: 15px; border-radius: 5px; }
    .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ResearchCollab</h1>
    </div>
    <div class="content">
      <h2>Application Status Update</h2>
      <p>Hi ${recipientName},</p>
      <div class="status-${status}">
        <strong>Your application for "${projectTitle}" has been ${statusText}</strong>
      </div>
      ${reviewNotes ? `<div style="background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 20px 0;"><strong>Review notes:</strong><br>${reviewNotes}</div>` : ''}
      <p>Login to ResearchCollab to view your application details:</p>
      <a href="${loginUrl}" class="button">View Application</a>
    </div>
    <div class="footer">
      <p>This email was sent from ResearchCollab - Connecting researchers worldwide</p>
    </div>
  </div>
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
    const subject = `New application for your project: ${projectTitle}`;
    
    const text = `
Hi ${recipientName},

You have received a new application for your research project "${projectTitle}" from ${applicantName}.

Login to ResearchCollab to review the application:
${loginUrl}

Best regards,
The ResearchCollab Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ResearchCollab</h1>
    </div>
    <div class="content">
      <h2>🎉 New Application Received!</h2>
      <p>Hi ${recipientName},</p>
      <p>You have received a new application for your research project:</p>
      <h3>📊 ${projectTitle}</h3>
      <p>Applicant: <strong>${applicantName}</strong></p>
      <p>Login to ResearchCollab to review the application and make a decision:</p>
      <a href="${loginUrl}" class="button">Review Application</a>
    </div>
    <div class="footer">
      <p>This email was sent from ResearchCollab - Connecting researchers worldwide</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return { to: recipientEmail, subject, text, html };
  }
}

export const emailService = new EmailService();