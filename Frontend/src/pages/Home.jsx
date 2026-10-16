import Navbar from '../component/Navbar'
import Hero from '../component/Hero'
import ProductsSection from '../component/ProductsSection'
import Footer from '../component/Footer'


export default function Home() {
  return (
    <div className="bg-cacao-50 text-cacao-900 font-sans min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        <Hero />
        <ProductsSection />
      </main>

      <Footer />
    </div>
  )
}
