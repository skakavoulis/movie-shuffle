import Script from "next/script";
import { useAuth } from "@/context/AuthContext";

const HOTJAR_ID = process.env.NEXT_PUBLIC_HOTJAR_ID;
const EXCLUDED_EMAILS = ["sotiriskakavoulis@gmail.com", "aetagon@gmail.com"];

export default function Hotjar() {
  const { user, loading } = useAuth();

  if (!HOTJAR_ID) return null;
  // Wait for the session so the script never loads before we know who the user is.
  if (loading) return null;
  if (user?.email && EXCLUDED_EMAILS.includes(user.email.toLowerCase()))
    return null;

  console.warn("User email:", user?.email);

  return (
    <Script
      id="hotjar"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{
        __html: `
          (function(h,o,t,j,a,r){
            h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
            h.hj.l=1*new Date();
            h._hjSettings={hjid:${HOTJAR_ID},hjsv:6};
            a=o.getElementsByTagName('head')[0];
            r=o.createElement('script');r.async=1;
            r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
            a.appendChild(r);
          })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
        `,
      }}
    />
  );
}
