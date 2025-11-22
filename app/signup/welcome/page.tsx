import { redirect } from 'next/navigation';

export default function SignupWelcomeRedirect() {
  redirect('/welcome');
}
