import Link from "next/link";

export default function ControllerHomePage() {
  return (
    <main>
      <p>Source of truth for race operations: signup, marshal logging, leaderboard, and audit corrections.</p>
      <div className="grid">
        <section className="card">
          <h2>Admin</h2>
          <p>Create races, register teams, and start race execution.</p>
          <Link href="/controller/admin" className="button-link">
            Open admin console
          </Link>
        </section>
        <section className="card">
          <h2>Marshal</h2>
          <p>One-tap pass logging designed for mobile race-day usage.</p>
          <Link href="/controller/marshal" className="button-link">
            Open marshal view
          </Link>
        </section>
        <section className="card">
          <h2>Leaderboard</h2>
          <p>Real-time ordering by relay sequence and recorded server timestamp.</p>
          <Link href="/controller/leaderboard" className="button-link">
            Open leaderboard
          </Link>
        </section>
      </div>
    </main>
  );
}
