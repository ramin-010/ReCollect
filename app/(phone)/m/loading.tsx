// The phone world while a screen is on its way (the owner, 11-21: a tab tap kept the old page for a second or two):
// the old page goes at once, the tab bar stays, the new screen fills in when it arrives.
export default function Loading() {
  return <div className="scroll" aria-busy="true" />;
}
