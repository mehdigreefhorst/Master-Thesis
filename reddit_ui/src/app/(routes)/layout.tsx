import { Navbar } from '@/components/layout/Navbar';

export default function ScraperLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      <div className="min-h-screen">
        {children}
      </div>
    </>
  )

}