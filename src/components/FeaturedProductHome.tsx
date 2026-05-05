import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, RotateCcw, Activity } from "lucide-react";
import { motion } from "motion/react";
import { Product, Variant, buyNow, getProduct } from "../lib/api";
import { useStore } from "../store/useStore";
import { toast } from "react-hot-toast";
import DOMPurify from 'dompurify';

export function FeaturedProductHome({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [currentVariant, setCurrentVariant] = useState<Variant | null>(null);
  const addItem = useStore((state) => state.addItem);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    getProduct(productId).then(p => {
      if (mounted && p) {
        setProduct(p);
      }
    }).catch(err => {
      console.error("Failed fetching featured product", err);
    });
    return () => { mounted = false; };
  }, [productId]);

  const calculatePrice = (p: Product, options: Record<number, number>) => {
    let price = Number(p.price) || 0;
    let matchingV: Variant | null = null;
    if (p.variants && p.options && p.options.length > 0) {
      const selectedOptionEntries = Object.entries(options).filter(([optId]) => 
        p.options?.some(o => o.id === Number(optId))
      );
      matchingV = p.variants.find(v => {
        if (!v.option_values) return false;
        return selectedOptionEntries.every(([optId, valId]) => 
          v.option_values?.some(vov => vov.option_id === Number(optId) && vov.id === Number(valId))
        );
      }) || null;
      if (matchingV && typeof matchingV.price === 'number') {
        price = matchingV.price;
      }
    }
    if (p.modifiers) {
      p.modifiers.forEach(mod => {
        const selectedValId = options[mod.id];
        if (selectedValId) {
          const val = mod.option_values.find(v => v.id === selectedValId);
          if (val?.adjusters?.price) {
            const adj = val.adjusters.price;
            const adjVal = Number(adj.adjuster_value) || 0;
            if (adj.adjuster === 'relative') {
              price += adjVal;
            } else if (adj.adjuster === 'percentage') {
              price += ((Number(p.price) || 0) * (adjVal / 100));
            }
          }
        }
      });
    }
    setCurrentVariant(matchingV);
    return price;
  };

  const isOptionValueDisabled = (optionId: number, valueId: number) => {
    if (!product || !product.variants || !product.options) return false;
    const testOptions = { ...selectedOptions, [optionId]: valueId };
    const variantOptionIds = product.options.map(o => o.id);
    const selectedVariantOptions = Object.entries(testOptions)
      .filter(([id]) => variantOptionIds.includes(Number(id)));
    const matchingVariants = product.variants.filter(v => {
      if (!v.option_values) return false;
      return selectedVariantOptions.every(([optId, valId]) => 
        v.option_values?.some(vov => vov.option_id === Number(optId) && vov.id === Number(valId))
      );
    });
    if (matchingVariants.length > 0) {
      return matchingVariants.every(v => v.purchasing_disabled);
    }
    return false;
  };

  useEffect(() => {
    if (product) {
      setCurrentPrice(calculatePrice(product, selectedOptions));
    }
  }, [product, selectedOptions]);

  const handleBuyNow = async () => {
    if (!product) return;
    try {
      const formattedOptions = Object.entries(selectedOptions).map(([modifier_id, option_value_id]) => ({
        modifier_id: Number(modifier_id),
        option_value_id: Number(option_value_id)
      }));
      const res = await buyNow(product.id, currentVariant?.id, formattedOptions);
      if (res && res.checkout_url) {
        window.location.href = res.checkout_url;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Checkout failed");
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, currentVariant?.id, selectedOptions, currentPrice);
    toast.success("Added to cart");
    navigate('/cart');
  };

  if (!product) {
    return null;
  }

  return (
    <section className="py-24 bg-gray-50 border-t border-gray-100" id="featured-product-hero">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="sticky top-24 relative aspect-square md:aspect-[4/3] lg:aspect-square bg-white rounded-3xl overflow-hidden shadow-2xl shadow-gray-200/50 group"
          >
            <img 
              src={product.primary_image?.url_zoom || product.primary_image?.url_standard || "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?q=80&w=600&auto=format&fit=crop"} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              alt={product.name}
            />
            <div className="absolute top-6 left-6 bg-black text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
              Featured product
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="w-full"
          >
            <h2 className="text-3xl md:text-5xl font-headline font-black mb-4 tracking-tight">{product.name}</h2>
            <div className="text-2xl font-bold text-primary mb-6">${(currentPrice || 0).toFixed(2)}</div>
            
            <div 
              className="text-gray-600 mb-8 leading-relaxed prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description) }}
            />

            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm mb-6">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                 <div className="text-amber-700"><RotateCcw className="w-4 h-4" /></div>
                 <h3 className="text-[10px] font-black uppercase tracking-widest">PRODUCT OPTIONS</h3>
              </div>
              <div className="p-6 space-y-6">
                 {product.options && product.options.map(option => (
                   <div key={option.id}>
                     <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">{option.display_name}</label>
                     <select 
                       className="w-full border border-gray-200 rounded-xl p-4 text-[11px] font-bold outline-none focus:border-[#5719D3] appearance-none bg-white"
                       value={selectedOptions[option.id] || ''}
                       onChange={(e) => setSelectedOptions(prev => ({...prev, [option.id]: Number(e.target.value)}))}
                     >
                        {option.option_values.map(val => {
                          const priceAdj = val.adjusters?.price?.adjuster_value;
                          const adjText = priceAdj ? ` (+${val.adjusters?.price?.adjuster === 'percentage' ? priceAdj + '%' : '$' + priceAdj})` : '';
                          const isDisabled = isOptionValueDisabled(option.id, val.id);
                          return (
                            <option key={val.id} value={val.id} disabled={isDisabled}>
                              {val.label}{adjText}{isDisabled ? ' (Unavailable)' : ''}
                            </option>
                          );
                        })}
                     </select>
                   </div>
                 ))}
                 
                 {product.modifiers && product.modifiers.map(modifier => (
                   <div key={modifier.id}>
                     <label className="block text-[9px] font-black uppercase text-amber-700 tracking-widest mb-3">{modifier.display_name}</label>
                     <div className="grid grid-cols-2 gap-2">
                       {modifier.option_values.map(val => (
                         <button 
                           key={val.id}
                           onClick={() => setSelectedOptions(prev => ({...prev, [modifier.id]: val.id}))}
                           className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${selectedOptions[modifier.id] === val.id ? 'bg-[#6c2bd9] text-white' : 'border border-gray-200 text-gray-900 hover:bg-gray-50'}`}
                         >
                           {val.label}
                         </button>
                       ))}
                     </div>
                   </div>
                 ))}

                 {(!product.options || product.options.length === 0) && (!product.modifiers || product.modifiers.length === 0) && (
                   <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">No additional options</div>
                 )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={handleAddToCart} 
                disabled={currentVariant?.purchasing_disabled}
                className="flex-1 py-5 border border-gray-200 rounded-2xl text-[13px] font-black uppercase tracking-widest hover:border-gray-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ADD TO CART
              </button>
              <button 
                onClick={handleBuyNow}
                disabled={currentVariant?.purchasing_disabled}
                className="flex-1 py-5 bg-primary text-black rounded-2xl text-[13px] font-black uppercase tracking-widest hover:brightness-90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {currentVariant?.purchasing_disabled ? "UNAVAILABLE" : "BUY IT NOW"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mt-8">
              <Link to={`/product/${product.id}`} className="text-[11px] font-bold uppercase tracking-widest text-primary hover:underline underline-offset-4">
                View Full Product Details →
              </Link>
            </div>

          </motion.div>
        </div>
      </div>
    </section>
  );
}
