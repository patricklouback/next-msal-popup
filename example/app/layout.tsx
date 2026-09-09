import "./global.css";
import { Providers } from "./providers";

export const metadata = {
  title: "next-msal-popup",
  description: "Popup sign-in with MSAL Browser v5 in the Next.js App Router",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
