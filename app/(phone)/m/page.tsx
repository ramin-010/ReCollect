import { redirect } from 'next/navigation';

/** The phone world opens on Today. */
export default function PhoneStart() {
  redirect('/m/today');
}
