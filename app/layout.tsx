import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Mila Mobile',
  description: 'Digitaler Bau-, Reparatur- und Dokumentationsassistent',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <main className="shell">{children}</main>
        <nav className="bottom">
          <div className="bottomInner">
            <Link className="nav" href="/"><b>⌂</b>Start</Link>
            <Link className="nav" href="/new"><b>＋</b>Neu</Link>
            <Link className="nav" href="/history"><b>≡</b>Historie</Link>
          </div>
        </nav>
      </body>
    </html>
  );
}
