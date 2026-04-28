import { SignupForm } from "@/components/signups/SignupForm";

export default function SignupsPage() {
  return (
    <div className="signup-shell">
      <main className="signup-main page-stack">
        <section className="card signup-form-card">
          <h1>Team Signup</h1>
          <p className="muted">
            Register your team for organizer review before race day.
          </p>
        </section>
        <SignupForm />
      </main>
      <footer className="signup-footer">Celestial Circuit - public team registration intake.</footer>
    </div>
  );
}
