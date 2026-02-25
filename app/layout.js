import './globals.css';

export const metadata = {
  title: 'Beisser Lumber — Garage Estimator',
  description: 'Material takeoff tool for gabled garage construction',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
