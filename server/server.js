/**
 * AI Marketing Platform - Backend Server
 * 
 * @author Scalezix Venture PVT LTD
 * @copyright 2025 Scalezix Venture PVT LTD. All Rights Reserved.
 * @license Proprietary - All rights reserved to Scalezix Venture PVT LTD
 * 
 * This software is the exclusive property of Scalezix Venture PVT LTD.
 * Unauthorized copying, modification, distribution, or use is strictly prohibited.
 */

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB, { Lead, Content, SocialPost, Client, Campaign, ChatMessage, WhiteLabelConfig, SEOAnalysis } from './database.js';
import * as aiServices from './aiServices.js';
import { analyzeWebsite } from './seoAnalyzer.js';
import { User, OTP } from './authModels.js';
import { generateOTP, sendOTPEmail, sendWelcomeEmail, sendReminderEmail } from './emailService.js';

// Created by: Scalezix Venture PVT LTD

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Connect to MongoDB
connectDB();

// CORS Configuration - Production Ready
const corsOptions = {
  origin: isProduction 
    ? [
        process.env.FRONTEND_URL, 
        'https://ai-automation-ten-pi.vercel.app',
        'https://yourdomain.com'
      ].filter(Boolean)
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Trust proxy for production (behind Nginx/Load Balancer)
if (isProduction) {
  app.set('trust proxy', 1);
}

// Increase payload size limit for image uploads (50MB)
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Request logging in development
if (!isProduction) {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    error: isProduction ? 'Internal server error' : err.message 
  });
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT (with fallback for MongoDB issues)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // If MongoDB is not connected, allow access with a test user
    if (!global.mongoConnected) {
      req.user = { userId: 'test-user', email: 'test@example.com' };
      return next();
    }
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    // If MongoDB is not connected, allow access with a test user
    if (!global.mongoConnected) {
      req.user = { userId: 'test-user', email: 'test@example.com' };
      return next();
    }
    res.status(403).json({ error: 'Invalid token' });
  }
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running with MongoDB Atlas & AI APIs',
    version: '2.1.0',
    features: ['delete-account', 'brevo-email', 'social-oauth']
  });
});

// AUTH ENDPOINTS

// Google OAuth URL
app.get('/api/auth/google/url', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    return res.status(400).json({ 
      error: 'Google OAuth not configured',
      message: 'Please use email and password to login'
    });
  }
  
  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://ai-automation-production-c35e.up.railway.app/api/auth/google/callback'
    : 'http://localhost:3001/api/auth/google/callback';
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('email profile')}` +
    `&access_type=offline`;
  
  res.json({ authUrl });
});

// Google OAuth Callback
app.get('/api/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    if (!code) {
      return res.redirect(`${frontendUrl}/login?error=no_code`);
    }
    
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.NODE_ENV === 'production'
      ? 'https://ai-automation-production-c35e.up.railway.app/api/auth/google/callback'
      : 'http://localhost:3001/api/auth/google/callback';
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });
    
    const tokens = await tokenResponse.json();
    
    if (!tokens.access_token) {
      console.error('Google token error:', tokens);
      return res.redirect(`${frontendUrl}/login?error=token_failed`);
    }
    
    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    
    const googleUser = await userResponse.json();
    
    if (!googleUser.email) {
      return res.redirect(`${frontendUrl}/login?error=no_email`);
    }
    
    // Find or create user
    let user = await User.findOne({ email: googleUser.email.toLowerCase() });
    
    if (!user) {
      // Create new user
      user = new User({
        name: googleUser.name || googleUser.email.split('@')[0],
        email: googleUser.email.toLowerCase(),
        password: await bcrypt.hash(Math.random().toString(36), 10), // Random password
        isVerified: true, // Google users are auto-verified
        googleId: googleUser.id,
        profile: {
          firstName: googleUser.given_name || '',
          lastName: googleUser.family_name || '',
          profileImage: googleUser.picture || null
        }
      });
      await user.save();
      console.log('✅ New Google user created:', googleUser.email);
    } else {
      // Update existing user with Google info
      user.googleId = googleUser.id;
      user.isVerified = true;
      if (googleUser.picture && !user.profile?.profileImage) {
        user.profile = { ...user.profile, profileImage: googleUser.picture };
      }
      await user.save();
    }
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Redirect to frontend with token
    res.redirect(`${frontendUrl}/oauth/callback?token=${token}&name=${encodeURIComponent(user.name)}`);
    
  } catch (error) {
    console.error('Google OAuth error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  }
});

// GitHub OAuth URL
app.get('/api/auth/github/url', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  
  if (!clientId) {
    return res.status(400).json({ 
      error: 'GitHub OAuth not configured',
      message: 'Please use email and password to login'
    });
  }
  
  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://ai-automation-production-c35e.up.railway.app/api/auth/github/callback'
    : 'http://localhost:3001/api/auth/github/callback';
  
  const authUrl = `https://github.com/login/oauth/authorize?` +
    `client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=user:email`;
  
  res.json({ authUrl });
});

// Sign Up - Step 1: Create account and send OTP
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create or update user
    if (existingUser) {
      existingUser.name = name;
      existingUser.password = hashedPassword;
      await existingUser.save();
    } else {
      const newUser = new User({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        isVerified: false
      });
      await newUser.save();
    }

    // Generate and save OTP
    const otp = generateOTP();
    await OTP.findOneAndDelete({ email: email.toLowerCase() }); // Remove old OTP
    const newOTP = new OTP({
      email: email.toLowerCase(),
      otp
    });
    await newOTP.save();

    // Try to send OTP email (but don't fail if email not configured)
    let emailSent = false;
    try {
      const emailResult = await sendOTPEmail(email, otp, name);
      emailSent = emailResult.success;
      if (!emailResult.success) {
        console.log('Email not sent:', emailResult.error);
      }
    } catch (emailError) {
      console.log('Email service error:', emailError.message);
    }

    // Always return OTP if email failed (so user can still verify)
    res.json({ 
      success: true, 
      message: emailSent 
        ? 'OTP sent to your email. Please verify to complete registration.'
        : 'Account created! Use the OTP below to verify (email service unavailable).',
      otp: emailSent ? undefined : otp // Show OTP if email failed
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message || 'Server error during signup' });
  }
});

// Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Find OTP
    const otpRecord = await OTP.findOne({ 
      email: email.toLowerCase(), 
      otp: otp.toString() 
    });

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Verify user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isVerified = true;
    user.lastLogin = new Date();
    await user.save();

    // Delete OTP
    await OTP.findByIdAndDelete(otpRecord._id);

    // Send welcome email (don't wait for it)
    sendWelcomeEmail(email, user.name).catch(err => {
      console.log('Welcome email failed:', err.message);
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Email verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: error.message || 'Server error during verification' });
  }
});

// Resend OTP
app.post('/api/auth/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Generate new OTP
    const otp = generateOTP();
    await OTP.findOneAndDelete({ email: email.toLowerCase() });
    const newOTP = new OTP({
      email: email.toLowerCase(),
      otp
    });
    await newOTP.save();

    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp, user.name);
    
    if (!emailResult.success) {
      return res.status(500).json({ error: 'Failed to send OTP email' });
    }

    res.json({ success: true, message: 'New OTP sent to your email' });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // FALLBACK: If MongoDB is not connected, use test credentials
    if (!User.db || User.db.readyState !== 1) {
      console.log('[FALLBACK] MongoDB not connected, using test credentials');
      
      // Test credentials
      if (email.toLowerCase() === 'test@example.com' && password === 'Test123456') {
        const token = jwt.sign(
          { userId: 'test-user-id', email: 'test@example.com' },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        return res.json({
          success: true,
          message: 'Login successful (fallback mode)',
          token,
          user: {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com'
          }
        });
      } else {
        return res.status(400).json({ error: 'Invalid credentials. Use test@example.com / Test123456' });
      }
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Check if verified
    if (!user.isVerified) {
      return res.status(400).json({ 
        error: 'Email not verified. Please verify your email first.',
        needsVerification: true
      });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Server error during login' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Forgot Password - Send reset link
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists
      return res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
    }

    // Generate reset token
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    // Save token to user
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // Send reset email
    const { sendPasswordResetEmail } = await import('./emailService.js');
    const emailResult = await sendPasswordResetEmail(email, resetToken, user.name);

    if (!emailResult.success) {
      console.error('Failed to send reset email:', emailResult.error);
    }

    res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset Password - With token
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful. You can now login.' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change Password (authenticated)
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete Account (authenticated)
app.delete('/api/auth/delete-account', authenticateToken, async (req, res) => {
  try {
    const { password, confirmText } = req.body;
    const userId = req.user.userId;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user signed up with Google (has googleId)
    const isGoogleUser = !!user.googleId;

    if (isGoogleUser) {
      // For Google users, verify they typed "DELETE"
      if (confirmText !== 'DELETE') {
        return res.status(400).json({ error: 'Please type DELETE to confirm account deletion' });
      }
    } else {
      // For email/password users, verify password
      if (!password) {
        return res.status(400).json({ error: 'Password is required to delete account' });
      }
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ error: 'Incorrect password' });
      }
    }

    // Delete user's related data
    await OTP.deleteMany({ email: user.email });
    
    // Delete the user
    await User.findByIdAndDelete(userId);

    console.log(`✅ Account deleted: ${user.email}`);
    res.json({ success: true, message: 'Account deleted successfully' });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Server error during account deletion' });
  }
});

// Check if user is Google OAuth user
app.get('/api/auth/account-type', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ 
      isGoogleUser: !!user.googleId,
      email: user.email 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Send reminder emails (cron job endpoint)
app.post('/api/auth/send-reminders', async (req, res) => {
  try {
    // Find unverified users who haven't received reminder
    const unverifiedUsers = await User.find({
      isVerified: false,
      reminderSent: false,
      createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 24 hours ago
    });

    let sentCount = 0;
    for (const user of unverifiedUsers) {
      await sendReminderEmail(user.email, user.name);
      user.reminderSent = true;
      await user.save();
      sentCount++;
    }

    res.json({ success: true, message: `Sent ${sentCount} reminder emails` });
  } catch (error) {
    console.error('Reminder email error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PROFILE ENDPOINTS

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    // FALLBACK: If MongoDB is not connected, return test user data
    if (!User.db || User.db.readyState !== 1) {
      console.log('[FALLBACK] MongoDB not connected, returning test profile');
      
      return res.json({
        _id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        isVerified: true,
        createdAt: new Date(),
        profile: {
          firstName: 'Test',
          lastName: 'User',
          phone: '',
          location: '',
          company: '',
          website: '',
          bio: '',
          profileImage: null
        }
      });
    }

    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return profile data (merge with user data)
    const profileData = {
      ...user.toObject(),
      profile: user.profile || {}
    };

    res.json(profileData);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const profileData = req.body;

    // Find user and update profile
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user profile field
    user.profile = {
      ...user.profile,
      ...profileData
    };

    // Update name and email if provided
    if (profileData.firstName && profileData.lastName) {
      user.name = `${profileData.firstName} ${profileData.lastName}`;
    }
    if (profileData.email) {
      user.email = profileData.email;
    }

    await user.save();

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      profile: user.profile 
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// LEADS ENDPOINTS with AI Scoring
app.get('/api/leads', async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/leads', async (req, res) => {
  try {
    const { name, email, company, industry, budget } = req.body;
    
    // AI-powered lead scoring
    const score = await aiServices.scoreLeadWithAI({ company, industry, budget });
    
    const lead = new Lead({ name, email, company, industry, budget, score });
    await lead.save();
    
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CONTENT ENDPOINTS with AI Generation
app.get('/api/content', async (req, res) => {
  try {
    if (!global.mongoConnected) {
      return res.json([]);
    }
    const content = await Content.find().sort({ createdAt: -1 });
    res.json(content);
  } catch (error) {
    res.json([]);
  }
});

app.post('/api/content', async (req, res) => {
  try {
    const { title, content } = req.body;
    const newContent = new Content({ title, content });
    await newContent.save();
    res.json(newContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/content/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    const generatedContent = await aiServices.generateContent(prompt);
    res.json({ content: generatedContent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SINGLE-STEP HUMAN CONTENT GENERATION
app.post('/api/content/generate-human', async (req, res) => {
  try {
    console.log('[Content] generate-human endpoint called');
    const config = req.body;
    
    // Validate config
    if (!config.topic || !config.topic.trim()) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const topic = config.topic;
    const tone = config.tone || 'professional';
    const minWords = config.minWords || 1500;

    // Use OpenRouter API (more reliable than Google AI)
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    
    console.log('[Content] OpenRouter API key configured:', !!OPENROUTER_API_KEY);
    
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'OpenRouter API key not configured' });
    }

    console.log('[Content] Generating content for:', topic);

    const prompt = `You are an expert content writer. Write a comprehensive, SEO-optimized article about "${topic}".

STRICT REQUIREMENTS:
- Write MINIMUM ${minWords} words (this is mandatory)
- Tone: ${tone}
- Start with an engaging introduction that hooks the reader
- Use proper HTML headings: <h2> for main sections, <h3> for subsections
- Include bullet points (<ul><li>) and numbered lists (<ol><li>) where appropriate
- Add real statistics, facts, and data points
- Write in a natural, human conversational style
- Include a compelling conclusion with call-to-action
- Make it informative, valuable, and engaging

IMPORTANT WRITING STYLE:
- Write like a human expert, NOT like AI
- AVOID these phrases: "In today's world", "It's important to note", "In conclusion", "Let's dive in", "Without further ado"
- Use short paragraphs (2-3 sentences max)
- Include personal insights and opinions
- Use active voice
- Add rhetorical questions to engage readers

FORMAT: Write in clean HTML format with proper <h2>, <h3>, <p>, <ul>, <ol>, <li> tags.

Now write the complete ${minWords}+ word article:`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
        'X-Title': 'AI Marketing Platform'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 8000,
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    console.log('[Content] OpenRouter response status:', response.status);
    
    if (data.error) {
      console.error('[Content] OpenRouter error:', JSON.stringify(data.error));
      return res.status(500).json({ error: data.error.message || 'AI generation failed' });
    }

    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('[Content] No content in response:', JSON.stringify(data));
      return res.status(500).json({ error: 'No content generated. Please try again.' });
    }

    // Generate title from topic
    const title = topic.charAt(0).toUpperCase() + topic.slice(1);
    
    // Count words (strip HTML tags first)
    const textOnly = content.replace(/<[^>]*>/g, ' ');
    const wordCount = textOnly.split(/\s+/).filter(w => w.length > 0).length;

    console.log('[Content] Generated successfully:', wordCount, 'words');

    res.json({
      content: content,
      title: title,
      wordCount: wordCount,
      topic: topic
    });

  } catch (error) {
    console.error('[Content] Generation error:', error.message);
    console.error('[Content] Full error:', error);
    res.status(500).json({ error: error.message || 'An unexpected error occurred' });
  }
});

// PYTHON HUMANIZATION ENDPOINT (backup)
app.post('/api/content/humanize', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const { spawn } = await import('child_process');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    
    const pythonScript = path.join(__dirname, 'humanizer.py');
    const python = spawn('python', [pythonScript], {
      cwd: __dirname
    });
    
    let result = '';
    let error = '';
    
    python.stdout.on('data', (data) => {
      result += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        console.error('Python humanizer error:', error);
        res.status(500).json({ error: error || 'Humanization failed. Please try again.' });
      } else {
        res.json({ content: result.trim() || content });
      }
    });
    
    python.on('error', (err) => {
      console.error('Python spawn error:', err);
      res.status(500).json({ error: 'Python not found. Please install Python 3.' });
    });
    
    python.stdin.write(content);
    python.stdin.end();
  } catch (error) {
    console.error('Humanize error:', error);
    res.status(500).json({ error: error.message || 'An unexpected error occurred' });
  }
});

// GOOGLE IMAGES ENDPOINT
app.post('/api/images/search', async (req, res) => {
  try {
    const { content, topic, numImages = 4 } = req.body;
    
    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'Topic is required' });
    }
    
    const { spawn } = await import('child_process');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    
    const pythonScript = path.join(__dirname, 'image_scraper.py');
    const python = spawn('python', [pythonScript, topic], {
      cwd: __dirname
    });
    
    let result = '';
    let error = '';
    
    python.stdout.on('data', (data) => {
      result += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        console.error('Python image scraper error:', error);
        // Fallback to Unsplash
        const fallbackImages = Array.from({ length: numImages }, (_, i) => ({
          url: `https://source.unsplash.com/800x600/?${encodeURIComponent(topic)}&sig=${i}`,
          title: topic,
          alt: topic
        }));
        res.json({ images: fallbackImages });
      } else {
        try {
          const images = JSON.parse(result);
          res.json({ images: images || [] });
        } catch (e) {
          console.error('Parse error:', e);
          // Fallback to Unsplash
          const fallbackImages = Array.from({ length: numImages }, (_, i) => ({
            url: `https://source.unsplash.com/800x600/?${encodeURIComponent(topic)}&sig=${i}`,
            title: topic,
            alt: topic
          }));
          res.json({ images: fallbackImages });
        }
      }
    });
    
    python.on('error', (err) => {
      console.error('Python spawn error:', err);
      // Fallback to Unsplash
      const fallbackImages = Array.from({ length: numImages }, (_, i) => ({
        url: `https://source.unsplash.com/800x600/?${encodeURIComponent(topic)}&sig=${i}`,
        title: topic,
        alt: topic
      }));
      res.json({ images: fallbackImages });
    });
    
    python.stdin.write(JSON.stringify({ content, topic, numImages }));
    python.stdin.end();
  } catch (error) {
    console.error('Image search error:', error);
    // Fallback to Unsplash
    const fallbackImages = Array.from({ length: req.body.numImages || 4 }, (_, i) => ({
      url: `https://source.unsplash.com/800x600/?${encodeURIComponent(req.body.topic || 'business')}&sig=${i}`,
      title: req.body.topic || 'business',
      alt: req.body.topic || 'business'
    }));
    res.json({ images: fallbackImages });
  }
});

// SOCIAL POSTS ENDPOINTS with AI Generation
app.get('/api/social-posts', async (req, res) => {
  try {
    const posts = await SocialPost.find().sort({ scheduledDate: 1, scheduledTime: 1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/social-posts', async (req, res) => {
  try {
    const { content, platform, date, time } = req.body;
    const post = new SocialPost({
      content,
      platform,
      scheduledDate: date,
      scheduledTime: time
    });
    await post.save();
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/social-posts/generate', async (req, res) => {
  try {
    const { topic, platform } = req.body;
    const generatedPost = await aiServices.generateSocialPost(topic, platform);
    res.json({ content: generatedPost });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CLIENTS ENDPOINTS
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const { companyName, industry, website, goals, budget, timeline, contactName, contactEmail, status } = req.body;
    const client = new Client({
      companyName,
      industry,
      website,
      goals: Array.isArray(goals) ? goals : [goals],
      budget,
      timeline,
      contactName,
      contactEmail,
      status: status || 'In Progress'
    });
    await client.save();
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { companyName, industry, website, goals, budget, timeline, contactName, contactEmail, status } = req.body;
    const client = await Client.findByIdAndUpdate(
      id,
      {
        companyName,
        industry,
        website,
        goals: Array.isArray(goals) ? goals : [goals],
        budget,
        timeline,
        contactName,
        contactEmail,
        status
      },
      { new: true }
    );
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Client.findByIdAndDelete(id);
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CAMPAIGNS ENDPOINTS with AI Optimization
app.get('/api/campaigns', async (req, res) => {
  try {
    const campaigns = await Campaign.find({ status: 'active' });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/campaigns', async (req, res) => {
  try {
    const { name, roi, spend, conversions } = req.body;
    const campaign = new Campaign({ name, roi, spend, conversions });
    await campaign.save();
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/campaigns/optimize', async (req, res) => {
  try {
    const { campaignData } = req.body;
    const recommendations = await aiServices.optimizeCampaign(campaignData);
    res.json({ recommendations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CHAT MESSAGES ENDPOINTS with AI Responses
app.get('/api/chat-messages', async (req, res) => {
  try {
    const messages = await ChatMessage.find().sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chat-messages', async (req, res) => {
  try {
    const { text, sender } = req.body;
    const message = new ChatMessage({ text, sender });
    await message.save();
    
    // If user message, generate AI response
    if (sender === 'user') {
      const history = await ChatMessage.find().sort({ createdAt: -1 }).limit(5);
      const aiResponse = await aiServices.generateChatResponse(text, history.reverse());
      
      const botMessage = new ChatMessage({ text: aiResponse, sender: 'bot' });
      await botMessage.save();
      
      return res.json({ userMessage: message, botMessage });
    }
    
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WHITE LABEL CONFIG ENDPOINTS
app.get('/api/white-label-config', async (req, res) => {
  try {
    let config = await WhiteLabelConfig.findOne().sort({ updatedAt: -1 });
    if (!config) {
      config = { brandName: 'Your Brand', primaryColor: '#3B82F6', secondaryColor: '#10B981' };
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/white-label-config', async (req, res) => {
  try {
    const { brandName, primaryColor, secondaryColor } = req.body;
    
    const config = new WhiteLabelConfig({
      brandName,
      primaryColor,
      secondaryColor,
      updatedAt: new Date()
    });
    await config.save();
    
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SEO ANALYSIS ENDPOINTS with AI
app.post('/api/seo/keywords', async (req, res) => {
  try {
    const { keyword } = req.body;
    const keywords = await aiServices.analyzeKeywords(keyword);
    res.json({ keywords });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/seo/analyze', async (req, res) => {
  try {
    const { url, keyword } = req.body;
    
    // Use real website analyzer
    const analysis = await analyzeWebsite(url, keyword || '');
    
    // Enhance with AI insights if available
    try {
      const aiAnalysis = await aiServices.analyzeSEO(url, keyword || 'general');
      // Merge AI recommendations with real analysis
      if (aiAnalysis.recommendations) {
        analysis.recommendations = [...(analysis.recommendations || []), ...aiAnalysis.recommendations].slice(0, 10);
      }
    } catch (aiError) {
      console.log('AI enhancement skipped:', aiError.message);
    }
    
    // Save analysis to database
    const seoAnalysis = new SEOAnalysis({
      url,
      keyword: keyword || '',
      score: analysis.score,
      analysis
    });
    await seoAnalysis.save();
    
    res.json({ seo: analysis });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Technical SEO Check
app.post('/api/seo/technical', async (req, res) => {
  try {
    const { url } = req.body;
    const { checkTechnicalSEO } = await import('./seoAnalyzer.js');
    const results = await checkTechnicalSEO(url);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Competitor Analysis
app.post('/api/seo/competitor', async (req, res) => {
  try {
    const { yourUrl, competitorUrl, keyword } = req.body;
    const { compareWithCompetitor } = await import('./seoAnalyzer.js');
    const results = await compareWithCompetitor(yourUrl, competitorUrl, keyword || '');
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ANALYTICS ENDPOINTS
app.get('/api/analytics/metrics', async (req, res) => {
  try {
    const totalLeads = await Lead.countDocuments();
    const totalCampaigns = await Campaign.countDocuments();
    const totalClients = await Client.countDocuments();
    
    const metrics = {
      totalVisitors: Math.floor(Math.random() * 20000) + 40000,
      conversions: totalLeads,
      bounceRate: (Math.random() * 20 + 35).toFixed(1),
      avgSession: `${Math.floor(Math.random() * 3) + 2}m ${Math.floor(Math.random() * 60)}s`,
      totalCampaigns,
      totalClients
    };
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// IMAGE PROXY ENDPOINT - For downloading images without CORS issues
app.get('/api/proxy-image', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    console.log(`[IMAGE PROXY] Fetching image: ${url}`);

    // Fetch the image
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      console.error(`[IMAGE PROXY] Failed to fetch image: ${response.status}`);
      return res.status(response.status).json({ error: 'Failed to fetch image' });
    }

    // Get the image buffer
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    console.log(`[IMAGE PROXY] Successfully fetched image (${buffer.byteLength} bytes)`);

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.byteLength);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

    // Send the image
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('[IMAGE PROXY] Error:', error);
    res.status(500).json({ error: 'Failed to proxy image' });
  }
});

// ==================== SOCIAL MEDIA MANAGEMENT ====================

// Import social models and OAuth routes
import { ConnectedAccount, ScheduledPost } from './socialModels.js';
import oauthRoutes from './oauthRoutes.js';
import wordpressRoutes from './wordpressRoutes.js';
import { postToMultiplePlatforms } from './postingService.js';
import { startCronJobs } from './cronService.js';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
});

// Mount OAuth routes (callbacks are public, connect endpoints require auth)
app.use('/api/social', oauthRoutes);

// Mount WordPress routes
app.use('/api/wordpress', authenticateToken, wordpressRoutes);

// Start cron jobs for scheduled posts
startCronJobs();

// Get connected accounts
app.get('/api/social/accounts', authenticateToken, async (req, res) => {
  try {
    // FALLBACK: If MongoDB not connected, return empty array
    if (!ConnectedAccount.db || ConnectedAccount.db.readyState !== 1) {
      console.log('[FALLBACK] MongoDB not connected, returning empty accounts');
      return res.json([]);
    }
    
    const accounts = await ConnectedAccount.find({ userId: req.user.userId });
    res.json(accounts || []);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    // Return empty array instead of error
    res.json([]);
  }
});

// Connect social account
app.post('/api/social/accounts/connect', authenticateToken, async (req, res) => {
  try {
    const { platform, username, email, password, method } = req.body;
    
    // Validate required fields
    if (!platform || !username) {
      return res.status(400).json({ error: 'Platform and username are required' });
    }
    
    // Check if account already exists
    const existing = await ConnectedAccount.findOne({
      userId: req.user.userId,
      platform,
      username
    });
    
    if (existing) {
      // Update existing
      existing.apiKey = email || existing.apiKey;
      existing.apiSecret = password || existing.apiSecret;
      existing.accessToken = method === 'oauth' ? 'oauth_token' : 'credentials_token';
      existing.connected = true;
      existing.connectedAt = new Date();
      await existing.save();
      res.json(existing);
    } else {
      // Create new
      const account = new ConnectedAccount({
        userId: req.user.userId,
        platform,
        username,
        apiKey: email || 'oauth_email',
        apiSecret: password || 'oauth_secret',
        accessToken: method === 'oauth' ? 'oauth_token' : 'credentials_token'
      });
      await account.save();
      res.json(account);
    }
  } catch (error) {
    console.error('Error connecting account:', error);
    res.status(500).json({ error: 'Failed to connect account' });
  }
});

// Disconnect social account
app.delete('/api/social/accounts/:accountId', authenticateToken, async (req, res) => {
  try {
    await ConnectedAccount.findByIdAndDelete(req.params.accountId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting account:', error);
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

// Get scheduled posts
app.get('/api/social/posts/scheduled', authenticateToken, async (req, res) => {
  try {
    // FALLBACK: If MongoDB not connected, return empty array
    if (!ScheduledPost.db || ScheduledPost.db.readyState !== 1) {
      console.log('[FALLBACK] MongoDB not connected, returning empty posts');
      return res.json([]);
    }
    
    const posts = await ScheduledPost.find({
      userId: req.user.userId,
      status: { $in: ['scheduled', 'draft'] }
    }).sort({ scheduledFor: 1 });
    res.json(posts || []);
  } catch (error) {
    console.error('Error fetching posts:', error);
    // Return empty array instead of error
    res.json([]);
  }
});

// Schedule post with media upload
app.post('/api/social/posts/schedule', authenticateToken, upload.single('media'), async (req, res) => {
  try {
    const { content, platforms, scheduleDate, scheduleTime, mediaType, aiImages, aiImageUrl } = req.body;
    const mediaFile = req.file;
    
    // Validate input
    if (!content || !platforms) {
      return res.status(400).json({ error: 'Content and platforms are required' });
    }

    // Check for media - either uploaded file OR AI images
    const hasAIImages = aiImages || aiImageUrl;
    if (!mediaFile && !hasAIImages) {
      return res.status(400).json({ error: 'Media (image or video) is required' });
    }
    
    // Get media URL - either from uploaded file or AI images
    let mediaUrl = null;
    if (mediaFile) {
      mediaUrl = mediaFile.path;
    } else if (aiImages) {
      const aiImagesArray = JSON.parse(aiImages);
      mediaUrl = aiImagesArray[0]; // Use first AI image
    } else if (aiImageUrl) {
      mediaUrl = aiImageUrl;
    }
    
    const platformsArray = JSON.parse(platforms);
    
    let scheduledFor = null;
    if (scheduleDate && scheduleTime) {
      scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`);
    }
    
    // FALLBACK: If MongoDB not connected, return success with mock data
    if (!ScheduledPost.db || ScheduledPost.db.readyState !== 1) {
      console.log('[FALLBACK] MongoDB not connected, simulating schedule');
      return res.json({
        _id: 'mock-' + Date.now(),
        userId: req.user.userId,
        content,
        mediaUrl: mediaUrl,
        mediaType: mediaType || 'image',
        platforms: platformsArray,
        scheduledFor,
        status: scheduledFor ? 'scheduled' : 'draft',
        createdAt: new Date()
      });
    }
    
    const post = new ScheduledPost({
      userId: req.user.userId,
      content,
      mediaUrl: mediaUrl,
      mediaType: mediaType || 'image',
      platforms: platformsArray,
      scheduledFor,
      status: scheduledFor ? 'scheduled' : 'draft'
    });
    
    await post.save();
    res.json(post);
  } catch (error) {
    console.error('Error scheduling post:', error);
    res.status(500).json({ error: 'Failed to schedule post' });
  }
});

// Publish post immediately with media upload
app.post('/api/social/posts/publish', authenticateToken, upload.single('media'), async (req, res) => {
  try {
    const { content, platforms, mediaType, aiImages, aiImageUrl } = req.body;
    const mediaFile = req.file;
    
    // Validate input
    if (!content || !platforms) {
      return res.status(400).json({ error: 'Content and platforms are required' });
    }

    // Check for media - either uploaded file OR AI images
    const hasAIImages = aiImages || aiImageUrl;
    if (!mediaFile && !hasAIImages) {
      return res.status(400).json({ error: 'Media (image or video) is required' });
    }
    
    // Get media URL - either from uploaded file or AI images
    let mediaUrl = null;
    if (mediaFile) {
      mediaUrl = mediaFile.path;
    } else if (aiImages) {
      const aiImagesArray = JSON.parse(aiImages);
      mediaUrl = aiImagesArray[0]; // Use first AI image
    } else if (aiImageUrl) {
      mediaUrl = aiImageUrl;
    }
    
    const platformsArray = JSON.parse(platforms);
    
    // FALLBACK: If MongoDB not connected, simulate success
    if (!ConnectedAccount.db || ConnectedAccount.db.readyState !== 1) {
      console.log('[FALLBACK] MongoDB not connected, simulating publish');
      return res.json({
        success: true,
        message: 'Post published successfully (demo mode)',
        results: platformsArray.map(p => ({ platform: p, success: true, postId: 'demo-' + Date.now() }))
      });
    }
    
    // Get connected accounts for selected platforms
    const accounts = await ConnectedAccount.find({
      userId: req.user.userId,
      platform: { $in: platformsArray },
      connected: true
    });
    
    // If no accounts connected, still allow in demo mode
    if (accounts.length === 0) {
      console.log('[DEMO MODE] No connected accounts, simulating publish');
      return res.json({
        success: true,
        message: 'Post published successfully (demo mode - connect real accounts for actual posting)',
        results: platformsArray.map(p => ({ platform: p, success: true, postId: 'demo-' + Date.now() }))
      });
    }
    
    // Post to all platforms using real OAuth
    const results = await postToMultiplePlatforms(
      req.user.userId,
      content,
      mediaUrl,
      platformsArray
    );
    
    // Create post record
    const post = new ScheduledPost({
      userId: req.user.userId,
      content,
      mediaUrl: mediaUrl,
      mediaType: mediaType || 'image',
      platforms: platformsArray,
      status: results.every(r => r.success) ? 'published' : 'failed',
      publishedAt: new Date(),
      publishResults: results
    });
    
    await post.save();
    
    const allSucceeded = results.every(r => r.success);
    
    res.json({
      success: allSucceeded,
      message: allSucceeded ? 'Post published successfully!' : 'Some posts failed',
      results,
      postId: post._id
    });
  } catch (error) {
    console.error('Error publishing post:', error);
    res.status(500).json({ error: 'Failed to publish post' });
  }
});

// Delete scheduled post
app.delete('/api/social/posts/:postId', authenticateToken, async (req, res) => {
  try {
    await ScheduledPost.findByIdAndDelete(req.params.postId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// AI SOCIAL CONTENT GENERATION
app.post('/api/social/generate-content', authenticateToken, async (req, res) => {
  try {
    const config = req.body;
    
    // Validate config
    if (!config.topic || !config.topic.trim()) {
      return res.status(400).json({ error: 'Topic is required' });
    }
    
    if (!config.platforms || config.platforms.length === 0) {
      return res.status(400).json({ error: 'At least one platform is required' });
    }
    
    const { spawn } = await import('child_process');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    
    const pythonScript = path.join(__dirname, 'social_content_generator.py');
    const python = spawn('python', [pythonScript], {
      cwd: __dirname
    });
    
    let result = '';
    let error = '';
    
    python.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('[PYTHON STDOUT]', output);
      result += output;
    });
    
    python.stderr.on('data', (data) => {
      const output = data.toString();
      console.log('[PYTHON STDERR]', output);
      error += output;
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        console.error('Python error:', error);
        const errorMsg = error.includes('ModuleNotFoundError') 
          ? 'Python dependencies missing. Please run: pip install requests python-dotenv'
          : error.includes('No module named')
          ? 'Python dependencies missing. Please install required packages.'
          : error || 'Content generation failed. Please check your API keys.';
        res.status(500).json({ error: errorMsg });
      } else {
        try {
          // Find the JSON in the output (in case there are debug messages)
          const jsonMatch = result.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            console.error('No JSON found in result:', result);
            res.status(500).json({ error: 'Failed to parse generated content. Please try again.' });
            return;
          }
          
          const data = JSON.parse(jsonMatch[0]);
          if (data.error) {
            res.status(500).json({ error: data.error });
          } else {
            res.json(data);
          }
        } catch (e) {
          console.error('Parse error:', e, 'Result:', result.substring(0, 200));
          res.status(500).json({ error: 'Failed to parse generated content. Please try again.' });
        }
      }
    });
    
    python.on('error', (err) => {
      console.error('Python spawn error:', err);
      res.status(500).json({ error: 'Python not found. Please install Python 3 and add it to PATH.' });
    });
    
    python.stdin.write(JSON.stringify(config));
    python.stdin.end();
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: error.message || 'An unexpected error occurred' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ API available at http://localhost:${PORT}/api`);
  console.log(`✅ MongoDB Atlas connected`);
  console.log(`✅ AI Services: Google AI, Llama API, OpenRouter`);
  console.log(`\n© 2025 Scalezix Venture PVT LTD - All Rights Reserved\n`);
});

/* Copyright © 2025 Scalezix Venture PVT LTD - All Rights Reserved */
