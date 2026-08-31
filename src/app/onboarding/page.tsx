import { redirect } from "next/navigation";

export default function OnboardingPage() {
  redirect("/admin?onboarding=1");
}
