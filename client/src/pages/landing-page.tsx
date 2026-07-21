import { Link } from "wouter";
import { useEffect } from "react";
import "./landing-page.css";

export default function LandingPage() {
  useEffect(() => {
    const animateValue = (el: HTMLElement, target: string) => {
      const suffix = target.replace(/\d+/g, "");
      const num = parseInt(target, 10) || 0;
      let current = 0;
      const step = Math.max(1, Math.ceil(num / 40));

      const timer = window.setInterval(() => {
        current = Math.min(current + step, num);
        el.textContent = `${current}${suffix}`;
        if (current >= num) {
          window.clearInterval(timer);
        }
      }, 30);
    };

    const statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            document.querySelectorAll<HTMLElement>(".stat-value").forEach((el) => {
              animateValue(el, el.textContent ?? "0");
            });
            statsObserver.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    const statsBar = document.querySelector(".stats-bar");
    if (statsBar) statsObserver.observe(statsBar);

    const fadeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-visible", "true");
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll<HTMLElement>(".feature-card, .testimonial-card, .step").forEach((el) => {
      fadeObserver.observe(el);
    });

    return () => {
      statsObserver.disconnect();
      fadeObserver.disconnect();
    };
  }, []);

  return (
    <>
      <nav>
        <div className="nav-inner">
          <div className="logo">
            <div className="logo-box">SS</div>
            <span className="logo-text">ScholarScape</span>
          </div>
          <div className="nav-btns">
            <Link href="/auth" className="btn btn-ghost">
              Sign In
            </Link>
            <Link href="/auth?role=student" className="btn btn-primary">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-inner">
          <span className="badge badge-teal">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
            AI-Powered Research Matching
          </span>
          <h1>
            Find Your Next <br />
            <span>Research Opportunity</span>
          </h1>
          <p>
            ScholarScape connects ambitious students with professors and real research projects. AI matches you to opportunities that fit your skills — then you apply in one click.
          </p>
          <div className="hero-btns">
            <Link href="/auth?role=student" className="btn btn-primary btn-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
              I'm a Student
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href="/auth?role=professor" className="btn btn-outline btn-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1 2-2V9m0 0h18" />
              </svg>
              I'm a Professor / Researcher
            </Link>
          </div>
          <p className="hero-note">Free to join · No credit card required</p>
        </div>
      </section>

      <div className="stats-bar">
        <div className="stats-inner">
          <div>
            <div className="stat-value">150+</div>
            <div className="stat-label">Research Projects</div>
          </div>
          <div>
            <div className="stat-value">40+</div>
            <div className="stat-label">Universities</div>
          </div>
          <div>
            <div className="stat-value">25+</div>
            <div className="stat-label">Fields of Study</div>
          </div>
          <div>
            <div className="stat-value">12+</div>
            <div className="stat-label">Countries</div>
          </div>
        </div>
      </div>

      <section className="section" id="features">
        <div className="section-inner two-col">
          <div>
            <span className="badge badge-teal">For Students</span>
            <h2 className="section-title" style={{ marginTop: ".75rem" }}>
              Get matched to research projects
              <br />
              that actually fit you
            </h2>
            <p className="section-sub">
              Stop sending cold emails. Our AI reads your profile, skills, and interests — then surfaces the research projects where you'd genuinely contribute. Apply with a cover letter and portfolio link in under 2 minutes.
            </p>
            <ul className="check-list">
              <li>
                <span className="check-icon">✓</span>
                AI recommendations based on your skills & interests
              </li>
              <li>
                <span className="check-icon">✓</span>
                Browse 150+ active research projects
              </li>
              <li>
                <span className="check-icon">✓</span>
                Discover real internships at NSF, NIH, NASA, CERN & more
              </li>
              <li>
                <span className="check-icon">✓</span>
                Track all your applications in one place
              </li>
            </ul>
            <Link href="/auth?role=student" className="btn btn-primary">
              Create Student Profile
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </div>
          <div className="card-stack">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <div>
                <h4>Browse & Search Projects</h4>
                <p>Filter by field, location, compensation, and timeline. See full project details before applying.</p>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
              </div>
              <div>
                <h4>Personalized AI Matches</h4>
                <p>Your dashboard shows a ranked list of projects matched to your exact background — updated in real time.</p>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div>
                <h4>Built-in Team Chat</h4>
                <p>Once accepted, collaborate with your research team directly inside ScholarScape.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="prof-section">
        <div className="section-inner two-col">
          <div className="prof-copy">
            <span className="badge badge-white">For Professors & Researchers</span>
            <h2 className="section-title section-title-white" style={{ marginTop: ".75rem" }}>
              Find motivated students<br />for your lab — fast
            </h2>
            <p className="section-sub section-sub-white">
              Post your research project in under 5 minutes. ScholarScape surfaces it to matched students, handles applications, and keeps you in control. No more inbox chaos.
            </p>
            <ul className="check-list check-list-prof">
              <li>
                <span className="check-icon check-icon-prof">✓</span>
                Post projects with required skills & compensation
              </li>
              <li>
                <span className="check-icon check-icon-prof">✓</span>
                Receive applications with AI match scores
              </li>
              <li>
                <span className="check-icon check-icon-prof">✓</span>
                Approve, reject, or request review with one click
              </li>
              <li>
                <span className="check-icon check-icon-prof">✓</span>
                Invite collaborators via email
              </li>
            </ul>
            <Link href="/auth?role=professor" className="btn btn-white">
              Post a Research Project
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </div>
          <div className="card-stack card-stack-prof">
            <div className="feature-card feature-card-dark">
              <div className="feature-icon feature-icon-dark">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div>
                <h4>AI-Screened Applicants</h4>
                <p>Every application comes with an AI match score so you review the best candidates first.</p>
              </div>
            </div>
            <div className="feature-card feature-card-dark">
              <div className="feature-icon feature-icon-dark">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
              <div>
                <h4>Instant Email Notifications</h4>
                <p>Get emailed the moment a student applies. Approve, review, or reject directly from your dashboard.</p>
              </div>
            </div>
            <div className="feature-card feature-card-dark">
              <div className="feature-icon feature-icon-dark">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <div>
                <h4>Shareable Project Links</h4>
                <p>Share your project on Reddit, Twitter, or your lab website. Students apply instantly.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="section-header-center">
            <h2 className="section-title">How it works</h2>
            <p className="section-sub" style={{ marginTop: ".75rem", maxWidth: "480px", marginInline: "auto" }}>
              From sign-up to collaboration in three simple steps
            </p>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-connector" />
              <div className="step-icon-wrap">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                <span className="step-num">1</span>
              </div>
              <h3>Create your profile</h3>
              <p>Tell us your skills, research interests, and academic level. Upload your CV optionally. Takes 3 minutes.</p>
            </div>
            <div className="step">
              <div className="step-connector" />
              <div className="step-icon-wrap">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                <span className="step-num">2</span>
              </div>
              <h3>Get matched</h3>
              <p>Our AI instantly surfaces the most relevant projects and internships for your exact background.</p>
            </div>
            <div className="step">
              <div className="step-icon-wrap">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/></svg>
                <span className="step-num">3</span>
              </div>
              <h3>Apply & collaborate</h3>
              <p>Submit your cover letter, get notified on decisions, and work with your team in the built-in chat.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="testimonials-section">
        <div className="testimonials">
          <div className="testimonial-card">
            <div className="stars">★★★★★</div>
            <blockquote>"I found a computational biology lab through ScholarScape in my first week. The AI match was spot on."</blockquote>
            <cite>Priya M.</cite>
            <small>Undergraduate · Biology</small>
          </div>
          <div className="testimonial-card">
            <div className="stars">★★★★★</div>
            <blockquote>"Posted my NLP project and had 8 strong applicants in two days. The match scores saved me hours of screening."</blockquote>
            <cite>Prof. James K.</cite>
            <small>Computer Science</small>
          </div>
          <div className="testimonial-card">
            <div className="stars">★★★★★</div>
            <blockquote>"The built-in chat made it so easy to coordinate with my new research team from day one."</blockquote>
            <cite>Marcus T.</cite>
            <small>MS Student · Data Science</small>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Ready to start?</h2>
        <p>Join hundreds of students and professors already using ScholarScape. It's completely free.</p>
        <div className="cta-btns">
          <Link href="/auth?role=student" className="btn btn-primary btn-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            Sign up as Student
          </Link>
          <Link href="/auth?role=professor" className="btn btn-outline btn-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1 2-2V9m0 0h18"/></svg>
            Sign up as Professor
          </Link>
        </div>
      </section>

      <footer>
        <div className="footer-logo">
          <div className="footer-logo-box">SS</div>
          <span>ScholarScape</span>
        </div>
        <p>Connecting researchers and students worldwide.</p>
      </footer>
    </>
  );
}
