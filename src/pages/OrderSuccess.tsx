import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { CheckCircle2, ArrowRight, Package, MapPin, Truck, Calendar, Download } from "lucide-react";
import { useStore } from "../store/useStore";
import { DeliveryTracker } from "../components/DeliveryTracker";
import { downloadImage } from "../lib/imageUtils";

export function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("id") || searchParams.get("order_id");
  const clearCart = useStore((state) => state.clearCart);
  const [summary, setSummary] = useState<any>(null);
  const [loadingByFetch, setLoadingByFetch] = useState(false);

  const getEstimatedDates = (timeframe: string) => {
    const defaultText = "Processing...";
    if (!timeframe) return defaultText;
    
    // Attempt to extract numbers
    const match = timeframe.match(/(\d+)(?:\s*-\s*(\d+))?/);
    if (match) {
      const minDays = parseInt(match[1], 10);
      const maxDays = match[2] ? parseInt(match[2], 10) : minDays;
      
      const addBusinessDays = (date: Date, days: number) => {
        const result = new Date(date);
        let added = 0;
        while (added < days) {
          result.setDate(result.getDate() + 1);
          if (result.getDay() !== 0 && result.getDay() !== 6) {
            added++;
          }
        }
        return result;
      };

      const start = addBusinessDays(new Date(), minDays);
      const end = addBusinessDays(new Date(), maxDays);
      
      const formatOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      if (start.getTime() === end.getTime()) {
         return start.toLocaleDateString(undefined, formatOpts);
      }
      return `${start.toLocaleDateString(undefined, formatOpts)} - ${end.toLocaleDateString(undefined, formatOpts)}`;
    }
    return timeframe;
  };

  useEffect(() => {
    clearCart();
    
    const saved = localStorage.getItem('recentOrderSummary');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure its the correct order
        if (orderId && String(parsed.orderId) === String(orderId)) {
          setSummary(parsed);
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    // If we reach here, we need to try and fetch from API if we have an ID
    // Note: Since this is for admin "view copy" too, we might need a specific endpoint or just check if user is admin
    // For now, let's assume we can fetch it if we have the ID to show the confirmation
    if (orderId) {
      setLoadingByFetch(true);
      import("axios").then(async ({ default: axios }) => {
        try {
          // Try admin endpoint first if we suspect admin (or just general endpoint if exists)
          // We'll use the existing admin endpoint if reachable, or a general one
          const res = await axios.get(`/api/admin/orders/${orderId}`).catch(() => 
            axios.get(`/api/orders/${orderId}/summary`) // fallback if we implement a public one
          );

          const order = res.data;
          setSummary({
            orderId: order.id,
            items: order.products.map((p: any) => ({
              name: p.name,
              quantity: p.quantity,
              price: p.price,
              primary_image: null // BigCommerce Order API doesn't return images directly in order products v2
            })),
            address: {
              firstName: order.shipping_address?.first_name || order.billing_address?.first_name,
              lastName: order.shipping_address?.last_name || order.billing_address?.last_name,
              address: order.shipping_address?.street_1 || order.billing_address?.street_1,
              city: order.shipping_address?.city || order.billing_address?.city,
              state: order.shipping_address?.state || order.billing_address?.state,
              zip: order.shipping_address?.zip || order.billing_address?.zip,
            },
            deliveryTimeframe: 'Standard Shipping',
            orderDate: order.date_created,
            total: order.total
          });
        } catch (err) {
          console.error("Failed to fetch order summary", err);
        } finally {
          setLoadingByFetch(false);
        }
      });
    }
  }, [clearCart, orderId]);

  if (loadingByFetch) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pt-32 pb-24 font-bold uppercase text-[10px] tracking-widest animate-pulse">
        Retrieving Confirmation Ledger...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-32 pb-24 relative overflow-hidden">
      {/* Abstract Background Design */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-50 rounded-full -translate-y-1/2 translate-x-1/3 opacity-50 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-50 rounded-full translate-y-1/3 -translate-x-1/4 opacity-40 blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto px-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border-4 border-black p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
        >
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center border-4 border-black border-dashed animate-spin-slow">
              <CheckCircle2 className="w-12 h-12 text-amber-600" />
            </div>
          </div>
          
          <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none mb-4">
            PAYMENT <span className="text-amber-600">LINKED</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-8 max-w-sm mx-auto leading-relaxed">
            Your transaction has been processed through the Square Secure Vault and synced to BigCommerce.
          </p>

          {orderId && (
            <div className="mb-10 p-6 bg-gray-50 border-2 border-black rounded-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">BigCommerce Order ID</p>
              <span className="text-3xl font-black tracking-widest text-black mb-2 block">
                #{orderId}
              </span>
            </div>
          )}

          {summary && (
            <div className="mb-10 text-left space-y-6">
              {/* Delivery Window */}
              <DeliveryTracker 
                orderDate={summary.orderDate || new Date()} 
                timeframe={summary.deliveryTimeframe} 
              />

              {/* Shipping Address */}
              <div className="p-6 border border-gray-100 rounded-2xl bg-white text-left">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-900">Shipping Destination</h3>
                </div>
                <div className="text-xs font-bold text-gray-600 space-y-1">
                  <p>{summary.address?.firstName} {summary.address?.lastName}</p>
                  <p>{summary.address?.address}</p>
                  <p>{summary.address?.city}, {summary.address?.state} {summary.address?.zip}</p>
                </div>
              </div>

              {/* Items */}
              <div className="p-6 border border-gray-100 rounded-2xl bg-white text-left">
                <div className="flex items-center gap-3 mb-4">
                  <Package className="w-4 h-4 text-gray-400" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-900">Order Manifest</h3>
                </div>
                <div className="space-y-4">
                  {summary.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-4 items-start border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                      <div className="relative">
                        <div className="w-12 h-12 rounded overflow-hidden border border-gray-200 shrink-0">
                          {item.primary_image ? (
                            <img src={item.primary_image.url_zoom || item.primary_image.url_standard} className="w-full h-full object-cover" alt={item.name} />
                          ) : <div className="w-full h-full bg-gray-100" />}
                        </div>
                        {item.artworkDataUrl && (
                          <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-white border border-gray-100 rounded shadow-sm overflow-hidden z-10">
                            <img src={item.artworkDataUrl} alt="Artwork" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-black italic uppercase leading-tight">{item.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Qty: {item.quantity || 1}</p>
                        {item.artworkDataUrl && (
                          <div className="flex gap-2 items-center mt-1">
                            <p className="text-[9px] text-primary font-black uppercase tracking-tighter italic">Artwork Attached</p>
                            <button 
                              onClick={() => {
                                const filename = `Order#${orderId}_${item.name.replace(/ /g, '_')}.jpg`;
                                downloadImage(item.artworkDataUrl, filename);
                              }}
                              className="text-[8px] font-black uppercase text-gray-400 hover:text-primary transition-colors flex items-center gap-1"
                            >
                              <Download className="w-2.5 h-2.5" /> Download
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-black">${((Number(item.price) || 0) * (Number(item.quantity) || 1)).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <Link 
              to="/dashboard"
              className="w-full flex items-center justify-center gap-2 bg-primary text-black font-bold uppercase tracking-widest text-xs py-4 rounded-xl hover:bg-primary transition-colors"
            >
              View Dashboard
            </Link>
            <Link 
              to="/shop"
              className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-900 font-bold uppercase tracking-widest text-xs py-4 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Continue Shopping <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
