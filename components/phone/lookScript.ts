// The phone world's look before the first paint (no 'use client': the phone layout, a server component, inlines it).
// It reads the device's look (Paper or Slate; light, dark or the system's) and sets it on <html>.

export const LOOK_KEY = 'rc-phone-look';

export const LOOK_SCRIPT = `try{var l=JSON.parse(localStorage.getItem('${LOOK_KEY}')||'null')||{};var t=l.theme==='slate'?'slate':'paper';var m=l.mode==='light'||l.mode==='dark'?l.mode:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var d=document.documentElement;d.setAttribute('data-pw-theme',t);d.setAttribute('data-pw-mode',m);}catch(e){}`;
