// The web app's look before the first paint (no 'use client': the root layout, a server component, inlines it).
// Paper sets data-look="paper" on <html> (app/theme-paper.css); Slate, the default, leaves it off.

export const WEB_LOOK_KEY = 'rc-web-look';

export const WEB_LOOK_SCRIPT = `try{if(localStorage.getItem('${WEB_LOOK_KEY}')==='paper')document.documentElement.setAttribute('data-look','paper')}catch(e){}`;
