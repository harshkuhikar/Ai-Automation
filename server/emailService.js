/**
 * Email Service for OTP and Notifications
 * Supports Gmail, AWS SES, and Resend
 * @author Harsh J Kuhikar
 * @copyright 2025 All Rights Reserved
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter based on configuration
let transporter;
let useResend = false;

if (process.env.RESEND_API_KEY) {
  // Resend Configuration (recommended for Railway)
  useResend = true;
  console.log('✅ Email Service: Resend configured');
} else if (process.env.EMAIL_SERVICE === 'ses') {
  // AWS SES Configuration
  transporter = nodemailer.createTransport({
    host: process.env.SES_SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SES_SMTP_USER,
      pass: process.env.SES_SMTP_PASSWORD
    }
  });
  console.log('✅ Email Service: AWS SES configured');
} else {
  // Gmail Configuration with SSL (port 465)
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000
  });
  console.log('✅ Email Service: Gmail configured');
}

// Verify email configuration on startup (only for nodemailer)
if (transporter) {
  transporter.verify((error, success) => {
    if (error) {
      console.log('⚠️ Email service not configured:', error.message);
    } else {
      console.log('✅ Email service ready to send');
    }
  });
}

// Generate 6-digit OTP
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper function to send email with timeout
async function sendMailWithTimeout(mailOptions, timeoutMs = 5000) {
  return Promise.race([
    transporter.sendMail(mailOptions),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email timeout')), timeoutMs)
    )
  ]);
}

// Send email via Resend API
async function sendViaResend(to, subject, html) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'AI Marketing <onboarding@resend.dev>',
      to: [to],
      subject,
      html
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Resend API error');
  }
  
  return response.json();
}

// Send OTP Email
export async function sendOTPEmail(email, otp, name) {
  const mailOptions = {
    from: process.env.EMAIL_USER || process.env.RESEND_FROM_EMAIL,
    to: email,
    subject: 'Verify Your Email - AI Marketing Platform',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f7; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
          .content { padding: 40px 30px; }
          .otp-box { background: #f5f5f7; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
          .otp { font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #667eea; }
          .footer { background: #f5f5f7; padding: 20px; text-align: center; color: #86868b; font-size: 14px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 AI Marketing Platform</h1>
          </div>
          <div class="content">
            <h2>Hi ${name || 'there'}! 👋</h2>
            <p style="font-size: 16px; color: #1d1d1f; line-height: 1.6;">
              Welcome to AI Marketing Platform! We're excited to have you on board.
            </p>
            <p style="font-size: 16px; color: #1d1d1f; line-height: 1.6;">
              To complete your registration, please verify your email address using the OTP below:
            </p>
            <div class="otp-box">
              <p style="margin: 0 0 10px 0; color: #86868b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your OTP Code</p>
              <div class="otp">${otp}</div>
              <p style="margin: 15px 0 0 0; color: #86868b; font-size: 13px;">Valid for 10 minutes</p>
            </div>
            <p style="font-size: 14px; color: #86868b; line-height: 1.6;">
              If you didn't request this code, please ignore this email.
            </p>
          </div>
          <div class="footer">
            <p>© 2025 AI Marketing Platform. All rights reserved.</p>
            <p>Powered by Harsh J Kuhikar</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    if (useResend) {
      await sendViaResend(email, mailOptions.subject, mailOptions.html);
    } else {
      await sendMailWithTimeout(mailOptions, 5000); // 5 second timeout
    }
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

// Send Welcome Email
export async function sendWelcomeEmail(email, name) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Welcome to AI Marketing Platform! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f7; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
          .content { padding: 40px 30px; }
          .feature { margin: 20px 0; padding: 20px; background: #f5f5f7; border-radius: 12px; }
          .feature h3 { margin: 0 0 10px 0; color: #1d1d1f; }
          .button { display: inline-block; background: #667eea; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 20px 0; }
          .footer { background: #f5f5f7; padding: 20px; text-align: center; color: #86868b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome Aboard!</h1>
          </div>
          <div class="content">
            <h2>Hi ${name}! 👋</h2>
            <p style="font-size: 16px; color: #1d1d1f; line-height: 1.6;">
              Your account is now active! You're all set to explore our powerful AI marketing tools.
            </p>
            <div class="feature">
              <h3>✨ What You Can Do:</h3>
              <ul style="color: #1d1d1f; line-height: 1.8;">
                <li>Generate human-like content with AI</li>
                <li>Create SEO-optimized articles</li>
                <li>Manage social media posts</li>
                <li>Track leads and campaigns</li>
                <li>Analyze website SEO</li>
              </ul>
            </div>
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="button">Get Started Now</a>
            </div>
          </div>
          <div class="footer">
            <p>© 2025 AI Marketing Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Welcome email error:', error);
    return { success: false, error: error.message };
  }
}

// Send Reminder Email for Pending Verification
export async function sendReminderEmail(email, name) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Complete Your Registration - AI Marketing Platform',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f7; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
          .content { padding: 40px 30px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 20px 0; }
          .footer { background: #f5f5f7; padding: 20px; text-align: center; color: #86868b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Don't Miss Out!</h1>
          </div>
          <div class="content">
            <h2>Hi ${name}! 👋</h2>
            <p style="font-size: 16px; color: #1d1d1f; line-height: 1.6;">
              We noticed you started signing up but haven't completed your email verification yet.
            </p>
            <p style="font-size: 16px; color: #1d1d1f; line-height: 1.6;">
              Your account is almost ready! Just verify your email to unlock all our powerful AI marketing tools.
            </p>
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="button">Complete Registration</a>
            </div>
            <p style="font-size: 14px; color: #86868b; line-height: 1.6; margin-top: 30px;">
              If you didn't sign up, you can safely ignore this email.
            </p>
          </div>
          <div class="footer">
            <p>© 2025 AI Marketing Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Reminder email error:', error);
    return { success: false, error: error.message };
  }
}


// Send Password Reset Email
export async function sendPasswordResetEmail(email, resetToken, name) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Reset Your Password - AI Marketing Platform',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f7; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
          .content { padding: 40px 30px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 20px 0; }
          .footer { background: #f5f5f7; padding: 20px; text-align: center; color: #86868b; font-size: 14px; }
          .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hi ${name || 'there'}! 👋</h2>
            <p style="font-size: 16px; color: #1d1d1f; line-height: 1.6;">
              We received a request to reset your password for your AI Marketing Platform account.
            </p>
            <p style="font-size: 16px; color: #1d1d1f; line-height: 1.6;">
              Click the button below to reset your password:
            </p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <div class="warning">
              <p style="margin: 0; font-size: 14px; color: #856404;">
                ⚠️ This link will expire in 1 hour. If you didn't request this, please ignore this email.
              </p>
            </div>
            <p style="font-size: 14px; color: #86868b; line-height: 1.6;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
          <div class="footer">
            <p>© 2025 AI Marketing Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Password reset email error:', error);
    return { success: false, error: error.message };
  }
}

// Send Login Alert Email (Security)
export async function sendLoginAlertEmail(email, name, loginInfo) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'New Login Detected - AI Marketing Platform',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f7; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
          .content { padding: 40px 30px; }
          .info-box { background: #f5f5f7; padding: 20px; border-radius: 12px; margin: 20px 0; }
          .footer { background: #f5f5f7; padding: 20px; text-align: center; color: #86868b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 New Login Alert</h1>
          </div>
          <div class="content">
            <h2>Hi ${name}! 👋</h2>
            <p style="font-size: 16px; color: #1d1d1f; line-height: 1.6;">
              We detected a new login to your AI Marketing Platform account.
            </p>
            <div class="info-box">
              <p style="margin: 5px 0;"><strong>📅 Time:</strong> ${loginInfo.time || new Date().toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>🌐 IP Address:</strong> ${loginInfo.ip || 'Unknown'}</p>
              <p style="margin: 5px 0;"><strong>💻 Device:</strong> ${loginInfo.device || 'Unknown'}</p>
            </div>
            <p style="font-size: 14px; color: #86868b; line-height: 1.6;">
              If this was you, no action is needed. If you didn't log in, please change your password immediately.
            </p>
          </div>
          <div class="footer">
            <p>© 2025 AI Marketing Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Login alert email error:', error);
    return { success: false, error: error.message };
  }
}
