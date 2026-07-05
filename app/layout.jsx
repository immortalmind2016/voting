import './globals.css';

export const metadata = {
  title: 'Votes',
  description: 'Create polls, let people join and vote.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
