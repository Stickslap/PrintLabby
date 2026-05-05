import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Zap, Shield, Sparkles, ShoppingCart } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { getProducts, Product } from "../lib/api";
import { useStore } from "../store/useStore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import DOMPurify from 'dompurify';
import { FeaturedProductHome } from "../components/FeaturedProductHome";

export function Home() {
  const { products, setProducts } = useStore();
  const featured = products.slice(0, 3);
  const [localFeatured, setLocalFeatured] = useState<Product[]>(featured);
  const [heroProduct, setHeroProduct] = useState<Product | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGlobalSettingsAndProducts = async () => {
      let heroId: string | null = "117"; // Default to a real ID found in the store
      try {
        const snap = await getDoc(doc(db, "settings", "global"));
        if (snap.exists()) {
          const config = JSON.parse(snap.data().content || "{}");
          if (config.featuredProductId) {
             heroId = config.featuredProductId;
          }
        }
      } catch (err) {
        console.error("Failed to load global settings");
      }

      if (products.length === 0) {
        getProducts().then(all => {
          setProducts(all || []);
          setLocalFeatured(all.slice(0, 3));
          if (heroId) {
            const match = all.find(p => p.id.toString() === heroId);
            if (match) setHeroProduct(match);
          }
        });
      } else {
        setLocalFeatured(products.slice(0, 3));
        if (heroId) {
          const match = products.find(p => p.id.toString() === heroId);
          if (match) setHeroProduct(match);
        }
      }
    };
    fetchGlobalSettingsAndProducts();
  }, [products.length, setProducts]);

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-20 lg:pt-24 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-widest mb-8 lg:mb-10">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              The Print Labby Standard
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-black italic leading-[0.9] mb-8 lg:mb-12 tracking-tighter text-black uppercase transform -skew-x-2">
              Do not waste time <br className="hidden sm:block" />
              with other <br className="hidden sm:block" />
              Print shops.
            </h1>
            
            <p className="text-base md:text-xl text-gray-500 mx-auto lg:mx-0 max-w-xl mb-10 lg:mb-12 font-medium leading-relaxed">
              Express Delivery: 2–4 business days. Free Shipping included!
            </p>
            
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <Link 
                to="/signup" 
                className="w-full sm:w-auto bg-primary text-black px-8 py-4 lg:px-10 lg:py-5 rounded-2xl lg:rounded-3xl text-[13px] lg:text-[14px] font-black uppercase tracking-widest hover:brightness-90 transition-all shadow-[0_20px_40px_-10px_rgba(255,217,0,0.4)] text-center"
              >
                Join Print Labby Crew
              </Link>
              <Link 
                to="/shop" 
                className="w-full sm:w-auto bg-white border border-gray-100 text-black px-8 py-4 lg:px-10 lg:py-5 rounded-2xl lg:rounded-3xl text-[13px] lg:text-[14px] font-black uppercase tracking-widest hover:border-black transition-all flex items-center justify-center gap-3 group"
              >
                All products 
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative h-full flex items-center justify-center lg:justify-end lg:pr-10"
          >
            <motion.div 
              animate={{ 
                y: [0, -20, 0],
                rotate: [0, 1, -1, 0]
              }}
              transition={{ 
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative z-10 w-full max-w-[500px] lg:max-w-[600px]"
            >
              <div className="relative group p-0">
                {/* Image Container with soft shadow and slight rotation */}
                <div className="relative transform rotate-2 transition-transform duration-700 hover:rotate-0">
                   <img 
                    src="https://res.cloudinary.com/dabgothkm/image/upload/v1776984931/artwork/pending/U5wYESZ92zcpcIKR86reFlv6bxw1/eyt1l0wtdfn1ggjm0fcg.png"
                    className="w-full h-auto drop-shadow-[0_40px_80px_rgba(0,0,0,0.15)]"
                    alt="Hand holding VW Bus Sticker"
                    onError={(e) => {
                      // Fallback image if main src fails
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1523676060187-f55189a71f5e?auto=format&fit=crop&q=80&w=1000";
                    }}
                  />
                  
                  {/* Subtle highlight glow behind product */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-white via-transparent to-transparent opacity-50 -z-10 blur-3xl" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Hero Featured Product block */}
      {heroProduct && (
        <FeaturedProductHome productId={heroProduct.id.toString()} />
      )}



      {/* The Print Labby Method */}
      <section className="py-12 lg:py-24 bg-white text-gray-900 border-t border-gray-100">
        <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="text-center lg:text-left">
            <span className="text-[10px] font-black uppercase text-amber-700 tracking-[0.2em] mb-4 block">PRECISION IN EVERY CUT.</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-headline font-black italic uppercase tracking-tighter mb-4 md:mb-6 leading-[0.9]">
              <span>THE</span> <span>PRINT</span> <span>LABBY</span> <br className="hidden md:block"/> <span>METHOD</span>
            </h2>
            <p className="text-gray-600 text-sm md:text-base mb-6 md:mb-8 mx-auto lg:mx-0 max-w-lg leading-relaxed">
              Go behind the scenes of our print shop. From digital proofing to precision die-cutting, see how we craft the world's most durable stickers.
            </p>

            <div className="flex flex-wrap justify-center lg:justify-start gap-4">
              <div className="flex items-center gap-3 px-6 py-3 rounded-full border border-gray-200 bg-gray-50/50">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">UV-RESISTANT INKS</span>
              </div>
              <div className="flex items-center gap-3 px-6 py-3 rounded-full border border-gray-200 bg-gray-50/50">
                <Zap className="w-4 h-4 text-amber-700" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">PRECISION CUTTING</span>
              </div>
            </div>
          </div>
          
          <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 shadow-2xl transform lg:rotate-1">
             <iframe
               src="https://www.youtube.com/embed/MJ9JaM7tI3w?autoplay=1&mute=1&controls=0&disablekb=1&loop=1&playlist=MJ9JaM7tI3w&playsinline=1"
               className="absolute inset-0 w-full h-full object-cover scale-[1.2]"
               style={{ pointerEvents: 'none' }}
             />
             <div className="absolute inset-0 bg-black/10 pointer-events-none" />
          </div>
        </div>
      </section>
    </div>
  );
}
