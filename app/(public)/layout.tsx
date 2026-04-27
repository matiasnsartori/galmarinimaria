import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { WhatsappButton } from '@/components/layout/WhatsappButton';

const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '541126132412';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main">{children}</main>
      <Footer />
      <WhatsappButton
        phone={whatsappNumber}
        message="Hola María, llegué desde tu sitio y me interesa saber más."
      />
    </>
  );
}
