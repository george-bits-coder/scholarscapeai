/**
 * Authentication Module
 * 
 * This module handles user authentication and session management using Passport.js.
 * It implements local strategy for username/password authentication and integrates
 * with Express session middleware for maintaining user sessions.
 * 
 * Main Functions:
 * - setupAuth(app: Express): Sets up Passport.js authentication, session middleware,
 *   and authentication routes (login/register endpoints)
 * - Local Strategy: Validates username and password against stored user records
 * - Serialize/Deserialize User: Manages user session persistence
 * 
 * Routes Provided:
 * - POST /api/register: Create new user account
 * - POST /api/login: Authenticate user with username and password
 * - GET /api/logout: Destroy user session
 * - GET /api/me: Get current authenticated user profile
 */

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { matchingService } from "./matching-service";
import { User as SelectUser, type User } from "@shared/schema";
import { hashPassword, comparePasswords } from "./password";
import { createFirebaseId, getValue, listValues, queryValuesByChild, setValue, removeValue } from "./firebase";
import { randomBytes, createHash } from "crypto";
import { emailService } from "./emailService";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  const isProduction = app.get("env") === "production";
  const sessionSecret = process.env.SESSION_SECRET || "dev-secret";
  if (!process.env.SESSION_SECRET && isProduction) {
    console.warn("WARNING: SESSION_SECRET is not set in production environment");
  }

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: isProduction ? "none" as const : "lax" as const,
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      console.log(`Login attempt for username: ${username}`);
      const users = await queryValuesByChild<User>("users", "username", username);
      const user = users[0];
      if (!user) {
        console.log("User not found");
        return done(null, false);
      }
      
      console.log(`Stored password format: ${user.password.substring(0, 20)}...`);
      const passwordMatch = await comparePasswords(password, user.password);
      if (!passwordMatch) {
        console.log("Password comparison failed");
        return done(null, false);
      } else {
        console.log("Login successful");
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    const user = await getValue<User>(`users/${id}`);
    done(null, user || undefined);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registration attempt:", { ...req.body, password: "[REDACTED]" });
      
      const existingUsers = await queryValuesByChild<User>("users", "username", req.body.username);
      if (existingUsers.length > 0) {
        console.log("Username already exists:", req.body.username);
        return res.status(400).json({ error: "Username already exists" });
      }

      const id = createFirebaseId();
      const user = {
        id,
        ...req.body,
        password: await hashPassword(req.body.password),
        verified: false,
        emailVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any;

      await setValue(`users/${id}`, user);
      console.log("User created successfully:", user.id);

      try {
        await sendVerificationEmail(req, user);
      } catch (verificationError) {
        console.error("Verification email could not be sent:", verificationError);
      }

      req.login(user, (err: unknown) => {
        if (err) {
          console.error("Login error after registration:", err);
          return next(err);
        }
        res.status(201).json(user);
      });
    } catch (error: unknown) {
      console.error("Registration error:", error);
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: "Registration failed: " + message });
    }
  });

  app.post("/api/email-verification/resend", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Authentication required" });
    if ((req.user as any).emailVerified === true) return res.json({ message: "Your email is already verified." });

    try {
      await sendVerificationEmail(req, req.user);
      return res.json({ message: "A new verification link has been sent to your email." });
    } catch (error) {
      console.error("Verification email resend failed:", error);
      return res.status(500).json({ error: "Unable to send verification email. Please try again." });
    }
  });

  app.post("/api/email-verification/confirm", async (req, res) => {
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    if (!token) return res.status(400).json({ error: "A verification token is required." });

    try {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const verification = await getValue<{ userId: string; expiresAt: number }>(`emailVerificationTokens/${tokenHash}`);
      if (!verification || verification.expiresAt < Date.now()) {
        return res.status(400).json({ error: "This verification link is invalid or has expired." });
      }

      const user = await getValue<User>(`users/${verification.userId}`);
      if (!user) return res.status(400).json({ error: "This verification link is invalid or has expired." });
      await setValue(`users/${user.id}`, { ...user, verified: true, emailVerified: true, updatedAt: new Date().toISOString() });
      await removeValue(`emailVerificationTokens/${tokenHash}`);
      return res.json({ message: "Your email has been verified successfully." });
    } catch (error) {
      console.error("Email verification failed:", error);
      return res.status(500).json({ error: "Unable to verify your email. Please request a new link." });
    }
  });

  app.post("/api/password-reset/request", async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const genericResponse = { message: "If an account exists for that email, a password reset link has been sent." };

    if (!email) return res.status(200).json(genericResponse);

    try {
      const users = await listValues<User>("users");
      const user = users.find((candidate) => String((candidate as any).email || '').trim().toLowerCase() === email);

      if (user) {
        const token = randomBytes(32).toString("hex");
        const tokenHash = createHash("sha256").update(token).digest("hex");
        await setValue(`passwordResetTokens/${tokenHash}`, {
          userId: user.id,
          expiresAt: Date.now() + 60 * 60 * 1000,
        });

        const appUrl = (process.env.APP_URL || req.get("origin") || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
        const resetUrl = `${appUrl}/reset-password?token=${token}`;
        const emailTemplate = emailService.createPasswordResetEmail(
          email,
          user.name || (user as any).fullName || user.username || "there",
          resetUrl,
        );
        await emailService.sendEmail(emailTemplate);
      }

      return res.status(200).json(genericResponse);
    } catch (error) {
      console.error("Password reset request failed:", error);
      return res.status(200).json(genericResponse);
    }
  });

  app.post("/api/password-reset/confirm", async (req, res) => {
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!token || password.length < 6) {
      return res.status(400).json({ error: "A valid reset link and a password of at least 6 characters are required." });
    }

    try {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const resetRecord = await getValue<{ userId: string; expiresAt: number }>(`passwordResetTokens/${tokenHash}`);
      if (!resetRecord || resetRecord.expiresAt < Date.now()) {
        return res.status(400).json({ error: "This password reset link is invalid or has expired." });
      }

      const user = await getValue<User>(`users/${resetRecord.userId}`);
      if (!user) return res.status(400).json({ error: "This password reset link is invalid or has expired." });

      await setValue(`users/${user.id}`, {
        ...user,
        password: await hashPassword(password),
        updatedAt: new Date().toISOString(),
      });
      await removeValue(`passwordResetTokens/${tokenHash}`);
      return res.json({ message: "Your password has been reset successfully." });
    } catch (error) {
      console.error("Password reset confirmation failed:", error);
      return res.status(500).json({ error: "Unable to reset password. Please request a new link." });
    }
  });

  app.post("/api/login", (req, res, next) => {

    console.log("inside login")
    passport.authenticate("local", (err: unknown, user: Express.User | false | undefined, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      req.login(user, (loginErr: unknown) => {
        if (loginErr) {
          return next(loginErr);
        }
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    const sidName = "connect.sid";

    try {
      if (req.session) {
        req.session.destroy((destroyErr) => {
          if (destroyErr) {
            console.error("Error destroying session during logout:", destroyErr);
          }
          res.clearCookie(sidName, { path: "/" });
          res.json({ success: true });
        });
        return;
      }
    } catch (error) {
      console.error("Logout session cleanup failed:", error);
    }

    res.clearCookie(sidName, { path: "/" });
    res.json({ success: true });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  app.put("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Authentication required" });

    try {
      const allowedFields = [
        'fullName', 'name', 'affiliation', 'bio', 'googleScholarUrl', 'personalWebsite',
        'skills', 'publications', 'orcid', 'cvUrl', 'institution', 'organization'
      ];

      const updates: any = {};
      for (const key of Object.keys(req.body || {})) {
        if (allowedFields.includes(key)) updates[key] = req.body[key];
      }

      const existingUser = await getValue<User>(`users/${req.user!.id}`);
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updatedUser = {
        ...existingUser,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await setValue(`users/${req.user!.id}`, updatedUser);

      // Try to update matching embeddings in background (best-effort)
      try {
        await matchingService.updateUserEmbedding(req.user!.id);
      } catch (e) {
        console.error('Failed to update user embedding after profile update', e);
      }

      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  });
}

async function sendVerificationEmail(req: Express.Request, user: any) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await setValue(`emailVerificationTokens/${tokenHash}`, {
    userId: user.id,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });

  const appUrl = (process.env.APP_URL || req.get("origin") || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
  const verificationUrl = `${appUrl}/verify-email?token=${token}`;
  const recipientEmail = String(user.email || "").trim();
  if (!recipientEmail) throw new Error("User has no email address");
  await emailService.sendEmail(emailService.createEmailVerificationEmail(
    recipientEmail,
    user.name || user.fullName || user.username || "there",
    verificationUrl,
  ));
}
