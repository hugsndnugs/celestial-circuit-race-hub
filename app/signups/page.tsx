import { BrandHeader } from "@/components/signups/BrandHeader";
import { SignupForm } from "@/components/signups/SignupForm";

export default function SignupsPage() {
  return (
    <div className="flex min-h-screen flex-col gap-8 px-4 py-10 sm:px-6">
      <BrandHeader title="Team signup" />
      <main className="flex-1">
        <SignupForm />
      </main>
      <footer className="mx-auto max-w-3xl text-center text-xs text-cc-text/50">Celestial Circuit — public team registration intake.</footer>
    </div>
  );
}
