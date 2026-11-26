const d=["-mr-1","-mt-1","-translate-y-1/2","absolute","accent-primary","active:bg-primary/85","animate-pulse","animate-spin","appearance-none","aria-invalid:border-destructive","backdrop:bg-black/45","bg-border","bg-card","bg-destructive","bg-destructive/12","bg-input","bg-muted","bg-primary","bg-primary/12","bg-secondary","bg-success/15","bg-warning/15","bg-white","block","border","border-2","border-border","border-current","border-dashed","border-input","border-muted-foreground/30","border-t","border-t-primary","border-t-transparent","break-words","cursor-not-allowed","cursor-pointer","dark:bg-destructive/60","dark:hover:bg-destructive/70","disabled:cursor-not-allowed","disabled:opacity-50","disabled:pointer-events-none","divide-border","divide-y","duration-200","duration-300","field-sizing-content","flex","flex-1","flex-col","flex-col-reverse","flex-wrap","focus-visible:bg-accent","focus-visible:border-ring","focus-visible:ring-[3px]","focus-visible:ring-ring/25","focus-visible:ring-ring/40","font-medium","font-semibold","gap-0","gap-1","gap-1.5","gap-2","gap-3","gap-4","gap-5","gap-6","gap-8","grid","h-10","h-12","h-2","h-6","h-9","h-auto","h-full","h-px","hover:bg-accent","hover:bg-destructive/90","hover:bg-primary/90","hover:text-foreground","hover:underline","inline-block","inline-flex","items-center","items-end","items-start","items-stretch","justify-between","justify-center","justify-end","justify-start","leading-tight","line-clamp-2","line-through","m-0","max-h-[85dvh]","max-w-2xl","max-w-5xl","max-w-md","max-w-none","max-w-sm","min-h-11","min-h-14","min-h-24","min-h-9","min-w-0","mt-0.5","mt-auto","mx-auto","opacity-50","outline","outline-none","overflow-hidden","overflow-y-auto","p-0","p-1","p-4","p-6","pb-2","pb-[max(0.75rem,env(safe-area-inset-bottom))]","pb-[max(1.5rem,env(safe-area-inset-bottom))]","pl-4","placeholder:text-muted-foreground","pointer-coarse:h-10","pointer-coarse:h-11","pointer-coarse:size-10","pointer-coarse:size-11","pointer-events-none","pointer-fine:text-sm","pr-0","pr-2","pr-9","pt-4","px-0","px-2.5","px-3","px-4","px-6","py-10","py-2","py-2.5","py-3","relative","right-3","rounded","rounded-full","rounded-lg","rounded-md","rounded-t-2xl","rounded-xl","select-none","shadow-sm","shadow-xl","shadow-xs","shrink-0","size-10","size-12","size-4","size-5","size-8","size-9","sm:flex-none","sm:flex-row","sm:justify-end","sm:m-auto","sm:max-w-lg","sm:p-0","sm:p-5","sm:pt-5","sm:pt-6","sm:px-6","sm:rounded-2xl","sm:text-3xl","sm:w-[calc(100%-2rem)]","sm:w-auto","sm:w-fit","starting:open:opacity-0","starting:open:translate-y-6","static","tabular-nums","text-2xl","text-base","text-card-foreground","text-center","text-destructive","text-foreground","text-left","text-lg","text-muted-foreground","text-primary","text-primary-foreground","text-secondary-foreground","text-sm","text-success","text-warning","text-white","text-xs","top-1/2","tracking-tight","transition-[color,background-color,border-color,box-shadow,opacity]","transition-[color,background-color,box-shadow]","transition-[color,box-shadow,border-color]","transition-[translate,opacity]","transition-[width]","transition-colors","transition-transform","translate-x-0.5","translate-x-[1.375rem]","truncate","underline-offset-4","visible","w-11","w-full","whitespace-nowrap"],c="19.2.4",l="3.5.22",u="4.3.3",m={react:c,"react-dom":"19.2.4",vue:l,tailwindcss:u,"tailwind-merge":"3.7.0"},p=String.raw`
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css" layer(utilities);

/* dark: follows the host theme, not the operating system — the sandbox sets data-theme. */
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

@theme inline {
  --color-background: var(--knd-bg);
  --color-foreground: var(--knd-text);
  --color-card: var(--knd-surface);
  --color-card-foreground: var(--knd-text);
  --color-popover: var(--knd-surface);
  --color-popover-foreground: var(--knd-text);
  --color-primary: var(--knd-accent);
  --color-primary-foreground: var(--knd-accent-text);
  --color-secondary: var(--knd-surface-2);
  --color-secondary-foreground: var(--knd-text);
  --color-muted: var(--knd-surface-2);
  --color-muted-foreground: var(--knd-muted);
  --color-accent: var(--knd-hover);
  --color-accent-foreground: var(--knd-text);
  --color-destructive: var(--knd-bad);
  --color-success: var(--knd-good);
  --color-warning: var(--knd-warn);
  --color-border: var(--knd-border);
  --color-input: var(--knd-input-border);
  --color-ring: var(--knd-accent);

  --radius-sm: calc(var(--knd-radius) - 6px);
  --radius-md: calc(var(--knd-radius) - 4px);
  --radius-lg: calc(var(--knd-radius) - 2px);
  --radius-xl: var(--knd-radius);
  --radius-2xl: calc(var(--knd-radius) + 4px);
}

@layer base {
  *,
  ::before,
  ::after {
    border-color: var(--knd-border);
  }
  html {
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
  }
  body {
    background-color: var(--knd-bg);
    color: var(--knd-text);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  ::selection {
    background-color: color-mix(in oklab, var(--knd-accent) 25%, transparent);
  }
}
`;function h(e){return e===2?2:1}const n=2;function a(e){let r=2166136261;for(let t=0;t<e.length;t++)r^=e.charCodeAt(t),r=Math.imul(r,16777619);return(r>>>0).toString(36)}const g={1:`r1.${n}`,2:`r2.${n}.${a(JSON.stringify(m)+p+JSON.stringify(d))}`},b=new Set(["react","vue","kindredly-ui","kaboom"]);function x(e){if(!e||typeof e!="object"||Array.isArray(e))return null;const r=e;return typeof r.format!="string"||typeof r.hash!="string"||typeof r.js!="string"||r.runtime!==1&&r.runtime!==2||r.css!==void 0&&typeof r.css!="string"||r.libs!==void 0&&!(Array.isArray(r.libs)&&r.libs.every(t=>typeof t=="string"&&b.has(t)))||r.seal!==void 0&&typeof r.seal!="string"?null:{format:r.format,runtime:r.runtime,hash:r.hash,js:r.js,...typeof r.css=="string"?{css:r.css}:{},...Array.isArray(r.libs)?{libs:r.libs}:{},...typeof r.seal=="string"?{seal:r.seal}:{}}}async function f(e){var o;const r=new TextEncoder().encode(String(e??"")),t=(o=globalThis.crypto)==null?void 0:o.subtle;if(t){const s=new Uint8Array(await t.digest("SHA-256",r));return"sha256:"+Array.from(s,i=>i.toString(16).padStart(2,"0")).join("")}return"fnv:"+a(String(e??""))}async function v(e,r,t){return!e||e.runtime!==t||e.format!==g[t]?!1:e.hash===await f(r)}export{g as A,p as a,f as h,v as i,d as k,h as n,x as r};
