import './globals.css';
import ThemeToggle from '@/app/components/ThemeToggle';

export const metadata = {
  title: 'Votes',
  description: 'Create polls, let people join and vote.',
};

// Runs before paint so a saved dark preference doesn't flash light first.
const noFlashTheme = `
try {
  var t = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
      </head>
      <body>
        <div className="container">
          <div className="topbar">
            <ThemeToggle />
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
