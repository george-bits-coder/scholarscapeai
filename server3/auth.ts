import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { matchingService } from "./matching-service";
import { User as SelectUser } from "@shared/schema";
import { hashPassword, comparePasswords } from "./password";

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
      const user = await storage.getUserByUsername(username);
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
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registration attempt:", { ...req.body, password: "[REDACTED]" });
      
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        console.log("Username already exists:", req.body.username);
        return res.status(400).json({ error: "Username already exists" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
        verified: true, // Auto-verify new users so they appear in researchers
      });

      console.log("User created successfully:", user.id);

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

      const updated = await storage.updateUser(req.user!.id, updates);

      // Try to update matching embeddings in background (best-effort)
      try {
        await matchingService.updateUserEmbedding(req.user!.id);
      } catch (e) {
        console.error('Failed to update user embedding after profile update', e);
      }

      res.json(updated);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  });
}
