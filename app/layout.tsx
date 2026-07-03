import type { Metadata } from "next";
import { Sora, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-sora",
  display: "swap",
});
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SpectraForge",
  description: "Turn experiments into expertise.",
};

/**
 * No-FOUC theme boot: set data-sf + accent vars from localStorage before paint,
 * so the first frame already matches the persisted theme. Kept inline and tiny.
 * Mirrors the accentVars() derivation in lib/theme/palette.ts.
 */
const themeBootScript = `(function(){try{
  var PAL={azure:{d:'#3f97ff',ds:'#67adff',l:'#1f74e6',ls:'#1666cf'},electric:{d:'#6a7bff',ds:'#8a98ff',l:'#4453e6',ls:'#3a48cf'},cyan:{d:'#25c2e6',ds:'#54d4f0',l:'#0b93b8',ls:'#0a83a4'},cobalt:{d:'#3a64f0',ds:'#5d82f6',l:'#2748d6',ls:'#2240bf'}};
  var mode=localStorage.getItem('sf_theme')||'dark';
  var acc=localStorage.getItem('sf_accent')||'azure';
  var el=document.documentElement;
  el.setAttribute('data-sf',mode==='light'?'light':'dark');
  var p=PAL[acc]||PAL.azure; var light=mode==='light';
  var base=light?p.l:p.d, strong=light?p.ls:p.ds;
  function rgba(h,a){h=h.replace('#','');return 'rgba('+parseInt(h.slice(0,2),16)+','+parseInt(h.slice(2,4),16)+','+parseInt(h.slice(4,6),16)+','+a+')';}
  el.style.setProperty('--sf-accent',base);
  el.style.setProperty('--sf-accent-strong',strong);
  el.style.setProperty('--sf-accent-soft',rgba(base,light?0.10:0.14));
  el.style.setProperty('--sf-accent-ring',rgba(base,light?0.38:0.40));
}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-sf="dark"
      suppressHydrationWarning
      className={`${sora.variable} ${hanken.variable} ${jetbrains.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
