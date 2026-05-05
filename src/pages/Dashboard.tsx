import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { OrderProofs } from "../components/customer/OrderProofs";
import { 
  LayoutDashboard, 
  Package, 
  LifeBuoy, 
  Settings, 
  LogOut, 
  Search, 
  Plus, 
  ArrowRight,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Target,
  User,
  ShieldCheck,
  Send,
  Paperclip,
  ArrowLeft,
  MessageSquare,
  Star,
  Truck
} from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";

import { getOrderStatusStyle } from "../lib/orderUtils";

type Tab = 'overview' | 'orders' | 'support' | 'settings' | 'reviews' | 'rewards';

interface Review {
  id: string;
  productId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  status: string;
}

interface Order {
  id: string;
  status: string;
  date: string;
  total: number;
  items: { name: string; units: number }[];
}

interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  registryId: string;
  memberSince: string;
  lastSync: string;
  status: string;
  credit: number;
  tier: string;
}

interface Thread {
  id: string;
  subject: string;
  status: string;
  date: string;
  message: string;
}

export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState<any | null>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [newThreadReply, setNewThreadReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [newThreadForm, setNewThreadForm] = useState({ subject: '', message: '', orderId: 'General Print Labby Inquiry', type: 'General Inquiry' });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [fullOrderDetails, setFullOrderDetails] = useState<any | null>(null);
  const [orderMessages, setOrderMessages] = useState<any[]>([]);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [newOrderMsg, setNewOrderMsg] = useState("");
  const [sendingOrderMsg, setSendingOrderMsg] = useState(false);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [rewardHistory, setRewardHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const fetchReviews = async () => {
      try {
        const res = await axios.get(`/api/customer/reviews?email=${encodeURIComponent(user.email || "")}`);
        setMyReviews(res.data);
      } catch (err) {
        console.error("Error fetching my reviews:", err);
      }
    };

    const fetchRewardHistory = async () => {
      try {
        const res = await axios.get(`/api/customer/reward-history?email=${encodeURIComponent(user.email || "")}`);
        setRewardHistory(res.data);
      } catch (err) {
        console.error("Error fetching reward history:", err);
      }
    };
    
    fetchReviews();
    fetchRewardHistory();
  }, [user]);

  useEffect(() => {
    if (!selectedOrderId || !user) return;
    
    const fetchOrderDetail = async () => {
      setLoadingOrder(true);
      try {
        const [orderRes, msgRes] = await Promise.all([
          axios.get(`/api/customer/orders/${selectedOrderId}?email=${encodeURIComponent(user.email || "")}`),
          axios.get(`/api/customer/orders/${selectedOrderId}/messages?email=${encodeURIComponent(user.email || "")}`)
        ]);
        setFullOrderDetails(orderRes.data);
        setOrderMessages(msgRes.data);
      } catch (err) {
        console.error("Failed to fetch order detail:", err);
      } finally {
        setLoadingOrder(false);
      }
    };
    fetchOrderDetail();
  }, [selectedOrderId, user]);

  const handleSendOrderMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderMsg.trim() || !user) return;
    setSendingOrderMsg(true);
    try {
      await axios.post(`/api/customer/orders/${selectedOrderId}/messages`, {
        email: user.email,
        message: newOrderMsg
      });
      setNewOrderMsg("");
      const res = await axios.get(`/api/customer/orders/${selectedOrderId}/messages?email=${encodeURIComponent(user.email || "")}`);
      setOrderMessages(res.data);
    } catch (err) {
      console.error("Failed to send message");
    } finally {
      setSendingOrderMsg(false);
    }
  };

  const fetchThreads = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(`/api/customer/threads?email=${encodeURIComponent(user.email || "")}`);
      setThreads(res.data);
    } catch (e) {
      console.error("Failed to fetch threads", e);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const [ordersRes, profileRes] = await Promise.all([
          axios.get(`/api/customer/orders?email=${encodeURIComponent(user.email || "")}`),
          axios.get(`/api/customer/profile?email=${encodeURIComponent(user.email || "")}`)
        ]);
        setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data?.data && Array.isArray(ordersRes.data.data) ? ordersRes.data.data : []));
        setProfile(profileRes.data);

        await fetchThreads();

      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        if (err.response?.status === 401 || err.response?.status === 404) {
          logout();
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, navigate, fetchThreads]);

  if (!user || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white font-headline font-black uppercase tracking-[0.3em] text-xs">
      Syncing Registry...
    </div>
  );

  const handleLogout = () => {
    try {
      logout();
      navigate("/login");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReview = async (reviewId: string, productId: string) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      await axios.delete(`/api/customer/reviews/${reviewId}?productId=${productId}`);
      setMyReviews(prev => prev.filter(r => r.id !== reviewId));
      toast.success("Review deleted");
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error("Failed to delete review");
    }
  };

  const handleUpdateProfile = () => {
    toast.success("Identity Updated in Registry", {
      style: { background: '#000', color: '#fff', fontWeight: 'bold' }
    });
  };

  const handleFetchMessages = async (thread: any) => {
    setSelectedThread(thread);
    setLoadingThread(true);
    try {
      const res = await axios.get(`/api/customer/threads/${thread.id}/messages?type=${thread.type}&email=${user?.email}`);
      setThreadMessages(res.data);
    } catch (e) {
      toast.error("Failed to load messages");
    } finally {
      setLoadingThread(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThreadReply.trim() || !selectedThread || !user) return;
    setSendingReply(true);
    try {
      await axios.post(`/api/customer/threads/${selectedThread.id}/reply`, {
        message: newThreadReply,
        senderEmail: user.email,
        senderName: user.displayName || profile?.firstName || "Customer"
      });
      setNewThreadReply("");
      handleFetchMessages(selectedThread);
      toast.success("Reply recorded");
    } catch (e) {
      toast.error("Failed to post reply");
    } finally {
      setSendingReply(false);
    }
  };

  const handleInitiateThread = async () => {
    if (!newThreadForm.subject || !newThreadForm.message || !user) return;
    try {
      await axios.post('/api/contact', {
        name: user.displayName || `${profile?.firstName} ${profile?.lastName}`,
        email: user.email,
        subject: newThreadForm.subject,
        message: newThreadForm.message,
        orderId: newThreadForm.orderId.includes("#") ? newThreadForm.orderId.split("#")[1] : ""
      });
      setNewThreadForm({ subject: '', message: '', orderId: 'General Print Labby Inquiry', type: 'General Inquiry' });
      await fetchThreads();
      setActiveTab('support');
      toast.success("New thread initiated");
    } catch (e) {
      toast.error("Failed to start thread");
    }
  };

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col md:flex-row pt-20">
      {/* Mobile Sidebar Toggle */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-100 fixed top-20 left-0 right-0 z-50">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-primary" />
          <span className="text-xs font-black uppercase tracking-widest">{activeTab}</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 bg-gray-50 rounded-lg"
        >
          {isSidebarOpen ? <Plus className="w-5 h-5 rotate-45 transition-transform" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 768) && (
          <motion.aside 
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed left-0 top-20 bottom-0 w-64 bg-white border-r border-gray-100 flex flex-col z-[60] md:z-40 ${!isSidebarOpen && 'hidden md:flex'}`}
          >
            <nav className="flex-1 px-4 py-8 space-y-2">
              {[
                { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                { id: 'rewards', label: 'Rewards', icon: Star },
                { id: 'orders', label: 'My Orders', icon: Package },
                { id: 'reviews', label: 'My Reviews', icon: MessageSquare },
                { id: 'support', label: 'Support', icon: LifeBuoy },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => { 
                    setActiveTab(item.id as Tab); 
                    setSelectedOrderId(null);
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all ${
                    activeTab === item.id 
                      ? 'bg-primary text-black shadow-lg shadow-primary/20' 
                      : 'text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </nav>
            
            <div className="p-6 border-t border-gray-50">
              <button 
                onClick={handleLogout}
                className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors w-full"
              >
                <LogOut className="w-4 h-4" /> Terminate Session
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[55] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 p-4 md:p-12 mt-14 md:mt-0 transition-all">
        <div className="max-w-6xl mx-auto">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <header className="mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                  <h1 className="text-4xl md:text-6xl font-headline font-black uppercase tracking-tighter italic leading-none mb-2">
                    Member <span className="text-primary">Overview</span>
                  </h1>
                  <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest">Welcome Back, {profile?.firstName || user?.displayName?.split(' ')[0] || 'Member'}</p>
                </div>
                <button className="w-full md:w-auto bg-primary text-black px-6 py-4 md:py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                  <Plus className="w-3 h-3" /> Start New Project —
                </button>
              </header>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
                <div className="bg-white border border-gray-100 p-6 md:p-8 rounded-3xl relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Status</span>
                    <ShieldCheck className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-3xl md:text-4xl font-headline font-black italic tracking-tighter mb-2">{profile?.status}</p>
                  <p className="text-[8px] font-bold text-gray-300 uppercase">Member Since {profile?.memberSince}</p>
                </div>
                
                <div className="bg-white border border-gray-100 p-6 md:p-8 rounded-3xl relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Projects</span>
                    <Package className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-3xl md:text-4xl font-headline font-black italic tracking-tighter mb-2">{orders.length}</p>
                  <p className="text-[8px] font-bold text-gray-300 uppercase">Total Registry Items</p>
                </div>

                <div className="bg-white border border-gray-100 p-6 md:p-8 rounded-3xl relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Credit</span>
                    <CreditCard className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-3xl md:text-4xl font-headline font-black italic tracking-tighter mb-2">${(profile?.credit || 0).toFixed(2)}</p>
                  <p className="text-[8px] font-bold text-gray-300 uppercase">Registry Balance</p>
                </div>

                <div className="bg-[#FFF9F2] border border-orange-100 p-6 md:p-8 rounded-3xl relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-[10px] font-black uppercase text-orange-400 tracking-widest">Account Tier</span>
                    <Target className="w-4 h-4 text-orange-500" />
                  </div>
                  <p className="text-3xl md:text-4xl font-headline font-black italic tracking-tighter mb-2 text-orange-900">{profile?.tier}</p>
                  <p className="text-[8px] font-bold text-orange-300 uppercase">Gold Status Activated</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Recent Registry */}
                <div className="lg:col-span-3 bg-white border border-gray-100 rounded-[32px] md:rounded-[40px] p-6 md:p-10">
                  <div className="flex justify-between items-center mb-8 md:mb-10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg"><Package className="w-4 h-4 text-primary" /></div>
                      <div>
                        <h3 className="text-xs md:text-sm font-headline font-black uppercase tracking-tight">Recent Registry</h3>
                        <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest">Your Latest Fulfillment Activity</p>
                      </div>
                    </div>
                    <Link to="/dashboard" onClick={() => setActiveTab('orders')} className="text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-2">
                      See All <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  <div className="space-y-4 md:space-y-6">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3 md:gap-5">
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-50 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0"><Clock className="w-4 h-4 md:w-5 md:h-5 text-gray-300" /></div>
                          <div>
                            <p className="text-xs md:text-sm font-black tracking-tight italic">#{order.id}</p>
                            <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase">{order.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4">
                          <span className={`text-[8px] md:text-[9px] font-black px-2 md:px-3 py-1 rounded-full uppercase tracking-tighter ${getOrderStatusStyle(order.status)}`}>
                            {order.status === 'Awaiting Shipment' ? 'Packing' : (order.status.length > 8 ? order.status.substring(0, 8) + '...' : order.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Threads */}
                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-[32px] md:rounded-[40px] p-6 md:p-10">
                  <div className="flex justify-between items-center mb-8 md:mb-10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg"><LifeBuoy className="w-4 h-4 text-primary" /></div>
                      <div>
                        <h3 className="text-xs md:text-sm font-headline font-black uppercase tracking-tight">Active Threads</h3>
                      </div>
                    </div>
                    <Link to="/dashboard" onClick={() => setActiveTab('support')} className="text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-2">
                      Portal <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  <div className="space-y-6 md:space-y-8">
                    {threads.slice(0, 3).map((thread) => (
                      <div key={thread.id} className="group cursor-pointer" onClick={() => { setActiveTab('support'); handleFetchMessages(thread); }}>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-tight line-clamp-1">{thread.subject}</h4>
                          <span className={`text-[7px] md:text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                            thread.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>{thread.status}</span>
                        </div>
                        <p className="text-[9px] md:text-[10px] text-gray-400 font-medium italic leading-relaxed line-clamp-2">
                          {thread.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && !selectedOrderId && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <header className="mb-8 md:mb-12">
                <h1 className="text-4xl md:text-6xl font-headline font-black uppercase tracking-tighter italic leading-none mb-2">
                  My <span className="text-primary">Registry</span>
                </h1>
                <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest">A comprehensive log of your society print projects</p>
              </header>

              <div className="flex flex-col sm:flex-row gap-4 mb-8 md:mb-10">
                <div className="flex-1 relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-300" />
                  <input 
                    type="text" 
                    placeholder="Filter Registry..." 
                    className="w-full bg-white border border-gray-100 pl-14 md:pl-16 pr-8 py-4 md:py-5 rounded-2xl text-[10px] md:text-xs font-bold tracking-widest outline-none focus:border-primary transition-all uppercase"
                  />
                </div>
                <div className="flex gap-4">
                  <button className="flex-1 sm:flex-none bg-white border border-gray-100 px-6 md:px-10 py-4 md:py-5 rounded-2xl flex items-center justify-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all">
                    Refine
                  </button>
                  <button className="flex-1 sm:flex-none bg-primary text-black px-6 md:px-10 py-4 md:py-5 rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                    New —
                  </button>
                </div>
              </div>

              <div className="space-y-4 md:space-y-6">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white border border-gray-100 rounded-[24px] md:rounded-[32px] p-6 md:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:shadow-xl hover:shadow-gray-100 transition-all gap-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-10 w-full sm:w-auto">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-xl md:text-2xl font-headline font-black italic tracking-tighter">#{order.id}</h2>
                          <span className={`text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded uppercase ${getOrderStatusStyle(order.status)}`}>
                            {order.status === 'Awaiting Shipment' ? 'Packing' : order.status}
                          </span>
                        </div>
                        <p className="text-[9px] md:text-[10px] font-bold text-gray-300 uppercase">Logged: {order.date}</p>
                      </div>

                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-gray-50 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 md:w-6 md:h-6 text-gray-200" />
                        </div>
                        <div>
                          <p className="text-[11px] md:text-xs font-black tracking-tight mb-1 uppercase line-clamp-1">{order.items[0].name}</p>
                          <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase">Qty: {order.items[0].units}</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-left sm:text-right w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between">
                      <p className="text-lg md:text-2xl font-headline font-black tracking-tight">${(order.total || 0).toFixed(2)}</p>
                      <button 
                        onClick={() => setSelectedOrderId(order.id)}
                        className="text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:gap-4 transition-all group"
                      >
                        Project <ArrowRight className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Order Detail View */}
          {activeTab === 'orders' && selectedOrderId && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => { setSelectedOrderId(null); setFullOrderDetails(null); }} className="w-10 h-10 border border-gray-100 rounded-full flex items-center justify-center hover:bg-gray-50 transition-all">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-4">
                  <h1 className="text-5xl font-headline font-black uppercase tracking-tighter italic leading-none">
                    Project <span className="text-primary italic">#{selectedOrderId}</span>
                  </h1>
                </div>
                <div className="ml-auto flex gap-4">
                  <button className="bg-white border border-gray-100 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50">New Project —</button>
                </div>
              </div>

              {loadingOrder ? (
                <div className="p-20 text-center font-headline font-black uppercase italic tracking-widest text-xs animate-pulse">Syncing Manifest...</div>
              ) : fullOrderDetails ? (
                <>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-12 ml-14">Initiated: {fullOrderDetails.date}</p>

                  <div className="grid grid-cols-3 gap-8">
                    <div className="col-span-2 space-y-12">
                      <OrderProofs orderId={fullOrderDetails.id} />
                      
                      {/* Timeline */}
                      <div className="bg-white border border-gray-100 p-12 rounded-[40px]">
                        <div className="flex items-center gap-3 mb-10">
                          <Clock className="w-4 h-4 text-primary" />
                          <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Fulfillment Lifecycle</h3>
                        </div>
                        <div className="flex justify-between items-center relative">
                          <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 h-0.5 bg-gray-100 z-0" />
                          {[
                            { step: '1', label: 'Submitted', active: true },
                            { step: '2', label: 'Packing', active: ['Awaiting Shipment', 'Packing', 'Completed', 'Shipped', 'Ready for Pickup'].includes(fullOrderDetails.status) },
                            { step: '3', label: 'Shipped', active: ['Shipped', 'Completed'].includes(fullOrderDetails.status) },
                            { step: '4', label: 'Delivered', active: fullOrderDetails.status === 'Completed' },
                          ].map((item, i) => (
                            <div key={i} className="relative z-10 flex flex-col items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-black text-xs ${
                                item.active ? 'bg-white border-primary text-primary shadow-lg shadow-primary/10' : 'bg-gray-50 border-gray-100 text-gray-300'
                              }`}>
                                {item.active ? <CheckCircle2 className="w-5 h-5" /> : item.step}
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-widest ${item.active ? 'text-gray-900' : 'text-gray-300'}`}>{item.label}</span>
                            </div>
                          ))}
                        </div>

                        {fullOrderDetails.shipments && fullOrderDetails.shipments.length > 0 && (
                          <div className="pt-8 mt-8 border-t border-gray-50">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                              <Truck className="w-4 h-4 text-primary" /> Tracking Information
                            </h4>
                            <div className="space-y-4">
                              {fullOrderDetails.shipments.map((shipment: any, idx: number) => (
                                <div key={idx} className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                  <div>
                                    <div className="flex items-center gap-3 mb-2">
                                      <p className="text-xs font-black uppercase tracking-tight text-gray-900">{shipment.shipping_provider || 'Carrier Carrier'}</p>
                                      <span className="text-[8px] font-bold px-2 py-0.5 bg-gray-200 rounded text-gray-600 uppercase">{shipment.shipping_method || 'Standard'}</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                      {shipment.tracking_number ? `Tracking No: ${shipment.tracking_number}` : 'No tracking number available'}
                                    </p>
                                  </div>
                                  {shipment.tracking_link && (
                                    <a
                                      href={shipment.tracking_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[9px] font-black uppercase tracking-widest bg-white hover:bg-gray-100 text-primary px-6 py-3 rounded-xl transition-colors border border-gray-200 flex flex-shrink-0 items-center justify-center"
                                    >
                                      Track Package <ArrowRight className="w-3 h-3 ml-2 inline-block" />
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Manifest Items */}
                      <div className="bg-white border border-gray-100 p-10 rounded-[40px] space-y-8">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Project Manifest</h3>
                        {fullOrderDetails.items.map((item: any) => (
                          <div key={item.id} className="flex gap-8 border-b border-gray-50 pb-8 last:border-0 last:pb-0">
                            <div className="w-32 h-32 bg-gray-50 rounded-3xl flex items-center justify-center flex-shrink-0 border border-gray-100">
                              <Package className="w-12 h-12 text-gray-200" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-6">
                                <div>
                                  <h4 className="text-xl font-headline font-black italic tracking-tighter mb-1 uppercase">{item.name}</h4>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase">ITEM ID: {item.id}</p>
                                </div>
                                <div className="bg-gray-100 px-3 py-1 rounded-md text-[10px] font-black uppercase">Qty: {item.units}</div>
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="text-[11px] font-black text-primary">${(Number(item.price) || 0).toFixed(2)} / unit</div>
                                <Link 
                                  to={`/product/${item.product_id || item.id}#product-reviews`}
                                  className="text-[9px] font-black uppercase tracking-widest bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors border border-gray-100 flex items-center gap-2"
                                >
                                  <Star className="w-3 h-3 text-[#FFD700] fill-[#FFD700]" /> Write a Review
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Order Specific Messages */}
                      <div className="bg-white border border-gray-100 p-10 rounded-[40px] space-y-8">
                        <div className="flex items-center gap-3">
                          <Send className="w-4 h-4 text-primary" />
                          <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Project Signal Journal</h3>
                        </div>
                        
                        <div className="space-y-6 max-h-[300px] overflow-y-auto pr-4">
                          {orderMessages.length === 0 ? (
                            <p className="text-center py-8 text-[10px] font-black uppercase text-gray-300 tracking-widest">No signals recorded for this manifest</p>
                          ) : (
                            orderMessages.map((m: any, idx: number) => (
                              <div key={idx} className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-[10px] font-black uppercase text-gray-400">{new Date(m.date_created).toLocaleString()}</span>
                                  <span className="text-[8px] font-black bg-primary/10 text-primary px-1.5 rounded">PRINT LABBY LAB</span>
                                </div>
                                <p className="text-xs leading-relaxed font-bold italic text-gray-700 tracking-tight">{m.message}</p>
                              </div>
                            ))
                          )}
                        </div>

                        <form onSubmit={handleSendOrderMsg} className="pt-6 border-t border-gray-50 space-y-4">
                          <textarea 
                            value={newOrderMsg}
                            onChange={(e) => setNewOrderMsg(e.target.value)}
                            placeholder="TRANSMIT MESSAGE TO THE LAB..."
                            className="w-full bg-[#F9F9F9] border border-gray-100 p-6 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-primary transition-all uppercase placeholder:opacity-30"
                            rows={3}
                          />
                          <div className="flex justify-end">
                            <button 
                              disabled={sendingOrderMsg}
                              className="bg-primary text-black px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all shadow-lg disabled:opacity-50"
                            >
                              {sendingOrderMsg ? "TRANSMITTING..." : "SEND SIGNAL —"}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>

                    <div className="space-y-8">
                      {/* Total Card */}
                      <div className="bg-black text-white p-10 rounded-[44px] shadow-2xl">
                        <h3 className="text-[11px] font-black uppercase tracking-widest opacity-60 mb-8">Order Total</h3>
                        <div className="space-y-4 mb-10">
                          <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                            <span className="text-gray-400">Subtotal</span>
                            <span>${(fullOrderDetails.subtotal || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                            <span className="text-gray-400">Shipping</span>
                            <span>${(fullOrderDetails.shipping_cost || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                            <span className="text-gray-400">Tax</span>
                            <span>${(fullOrderDetails.tax || 0).toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="pt-8 border-t border-white/10 flex justify-between items-center">
                          <span className="text-xs font-black uppercase">Total</span>
                          <span className="text-5xl font-headline font-black italic tracking-tighter text-primary">${(fullOrderDetails.total || 0).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Logistics Registry */}
                      {fullOrderDetails.shipping_address && (
                        <div className="bg-white border border-gray-100 p-8 rounded-[40px]">
                          <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-8 flex items-center gap-2">
                            <Package className="w-4 h-4 text-primary" /> Logistics Registry
                          </h3>
                          <div className="flex gap-4">
                            <div className="p-2 bg-gray-50 rounded-lg h-fit"><MapPin className="w-5 h-5 text-primary" /></div>
                            <div>
                              <p className="text-[9px] font-black uppercase text-primary mb-1">Shipping Address</p>
                              <p className="text-xs font-bold text-gray-900 leading-relaxed uppercase">
                                {fullOrderDetails.shipping_address.first_name} {fullOrderDetails.shipping_address.last_name}<br />
                                {fullOrderDetails.shipping_address.street_1}<br />
                                {fullOrderDetails.shipping_address.city}, {fullOrderDetails.shipping_address.state} {fullOrderDetails.shipping_address.zip}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-20 text-center">Failed to load project details.</div>
              )}
            </motion.div>
          )}

          {/* Rewards Tab */}
          {activeTab === 'rewards' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 md:space-y-10">
              <header className="mb-8 md:mb-12">
                <h1 className="text-4xl md:text-6xl font-headline font-black uppercase tracking-tighter italic leading-none mb-2">
                  Member <span className="text-primary italic">Rewards</span>
                </h1>
                <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest">Earn 3% store credit on every society project</p>
              </header>

              {/* Reward Header Section */}
              <div className="bg-[#0A0A2E] rounded-[32px] md:rounded-[44px] p-8 md:p-16 text-center text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10 md:mb-14">
                    <div className="px-5 md:px-6 py-2.5 bg-blue-900/40 border border-blue-500/30 rounded-full flex items-center justify-center gap-2">
                      <div className="w-4 h-4 bg-[#FFD700] rounded-full shadow-[0_0_10px_rgba(255,215,0,0.5)] flex items-center justify-center text-[10px] text-orange-900 font-bold">C</div>
                      <span className="text-[9px] md:text-[11px] font-black uppercase tracking-widest">Earned: ${(rewardHistory.filter(h => h.type === 'earning').reduce((acc, h) => acc + h.amount, 0)).toFixed(2)}</span>
                    </div>
                    <div className="px-5 md:px-6 py-2.5 bg-white/5 border border-white/10 rounded-full flex items-center justify-center gap-2">
                      <div className="w-4 h-4 bg-gray-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">C</div>
                      <span className="text-[9px] md:text-[11px] font-black uppercase tracking-widest opacity-60">Spent: ${(rewardHistory.filter(h => h.type === 'redemption').reduce((acc, h) => acc + h.amount, 0)).toFixed(2)}</span>
                    </div>
                  </div>

                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 12 }}
                    className="mb-8 flex justify-center"
                  >
                    <div className="w-28 h-28 md:w-40 md:h-40 bg-[#FFD100] rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(255,209,0,0.2)] relative group">
                       <div className="absolute inset-2 border-[3px] md:border-4 border-orange-400 rounded-full flex items-center justify-center">
                          <Star className="w-10 h-10 md:w-16 md:h-16 text-orange-200 fill-orange-200 group-hover:scale-110 transition-transform" />
                       </div>
                    </div>
                  </motion.div>

                  <h2 className="text-2xl md:text-4xl font-headline font-black italic uppercase tracking-tight mb-4">Registry Credits Ready</h2>
                  <p className="text-sm md:text-lg font-bold text-blue-100 max-w-xl mx-auto mb-10 md:mb-12 opacity-80 leading-relaxed px-4">
                    You'll earn <span className="text-primary">3% store credit</span> on every society order. Credits are instantly deposited in our secure registry vault.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
                    <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-3xl backdrop-blur-sm">
                      <div className="text-primary text-xl md:text-2xl mb-3 md:mb-4 font-black">%</div>
                      <h4 className="text-lg md:text-xl font-headline font-black italic uppercase mb-1">3% Credit</h4>
                      <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ongoing Benefit</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-3xl backdrop-blur-sm">
                      <div className="text-emerald-400 text-xl md:text-2xl mb-3 md:mb-4 flex justify-center"><CheckCircle2 className="w-6 h-6 md:w-8 md:h-8" /></div>
                      <h4 className="text-lg md:text-xl font-headline font-black italic uppercase mb-1">Instant</h4>
                      <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest">Registry Sync</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-3xl backdrop-blur-sm">
                      <div className="text-blue-400 text-xl md:text-2xl mb-3 md:mb-4 font-black italic">∞</div>
                      <h4 className="text-lg md:text-xl font-headline font-black italic uppercase mb-1">Lifetime</h4>
                      <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest">Credits stay safe</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* History Section */}
              <div className="bg-white border border-gray-100 rounded-[32px] md:rounded-[40px] p-6 md:p-12 overflow-x-auto">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 md:mb-10">
                   <h3 className="text-xs md:text-sm font-headline font-black uppercase tracking-tight flex items-center gap-3">
                     <Clock className="w-4 h-4 text-primary" /> Reward Registry Log
                   </h3>
                   <div className="text-[9px] md:text-[10px] font-black uppercase text-gray-400">Total Events: {rewardHistory.length}</div>
                </header>

                <div className="space-y-4">
                  {rewardHistory.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-gray-50 rounded-3xl">
                      <p className="text-[11px] font-black uppercase text-gray-300 tracking-[0.2em]">No rewards recorded in your registry yet.</p>
                      <Link to="/shop" className="text-primary text-[10px] font-black uppercase mt-4 inline-block hover:underline">Start a Project —</Link>
                    </div>
                  ) : (
                    rewardHistory.map((item) => (
                      <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 md:p-6 bg-gray-50 rounded-2xl border border-gray-100 gap-4">
                        <div className="flex items-center gap-4 md:gap-6">
                           <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-black flex-shrink-0 ${
                             item.type === 'earning' ? 'bg-primary/10 text-primary' : 'bg-red-50 text-red-500'
                           }`}>
                             {item.type === 'earning' ? '+' : '-'}
                           </div>
                           <div>
                              <p className="text-xs md:text-sm font-black uppercase italic leading-tight">{item.description}</p>
                              <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase mt-1">{new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString()}</p>
                           </div>
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto px-2 sm:px-0 border-t sm:border-0 pt-3 sm:pt-0 border-gray-100">
                           <p className={`text-lg md:text-xl font-headline font-black italic ${item.type === 'earning' ? 'text-primary' : 'text-red-600'}`}>
                             {item.type === 'earning' ? '+' : '-'}${Number(item.amount).toFixed(2)}
                           </p>
                           <p className="text-[8px] md:text-[9px] font-bold text-gray-300 uppercase tracking-widest">{item.type === 'earning' ? 'Earned' : 'Redeemed'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Support Tab */}
          {activeTab === 'support' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <header className="text-center mb-10 md:mb-16">
                <h1 className="text-4xl md:text-7xl font-headline font-black uppercase tracking-tighter italic leading-none mb-2">
                  Resolution <span className="text-primary italic">Desk</span>
                </h1>
                <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed px-4">Direct Communication Threads with the Print Labby Lab</p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 md:gap-10">
                <div className="lg:col-span-3 bg-white border border-gray-100 rounded-[32px] md:rounded-[40px] p-6 md:p-12">
                  {selectedThread ? (
                    <div className="space-y-6 md:space-y-8">
                      <div className="flex items-center justify-between mb-6 md:mb-8">
                        <button 
                          onClick={() => setSelectedThread(null)}
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
                        >
                          <ArrowLeft className="w-3 h-3" /> Journal
                        </button>
                        <span className={`text-[8px] md:text-[9px] font-black px-2 md:px-3 py-1 rounded-full uppercase ${
                          selectedThread.status === 'OPEN' ? 'bg-primary text-black' : (selectedThread.status === 'REPLIED' ? 'bg-emerald-500 text-black' : 'bg-gray-100 text-gray-400')
                        }`}>{selectedThread.status}</span>
                      </div>

                      <h2 className="text-xl md:text-3xl font-headline font-black uppercase italic tracking-tighter mb-8 md:mb-10 line-clamp-2 md:line-clamp-none">{selectedThread.subject}</h2>

                      <div className="space-y-4 md:space-y-6 max-h-[300px] md:max-h-[400px] overflow-y-auto pr-2 md:pr-4 mb-8 md:mb-10 scrollbar-thin">
                        {loadingThread ? (
                          <p className="text-center py-10 text-[10px] font-black uppercase text-gray-300">Syncing Messages...</p>
                        ) : threadMessages.length === 0 ? (
                           <div className="p-4 md:p-6 bg-gray-50 rounded-2xl">
                             <p className="text-xs md:text-sm font-medium italic text-gray-500 overflow-wrap-anywhere">{selectedThread.message}</p>
                           </div>
                        ) : (
                          threadMessages.map((msg, idx) => (
                            <div key={idx} className={`p-4 md:p-6 rounded-2xl md:rounded-3xl max-w-[90%] md:max-w-[85%] ${msg.isStaff ? 'bg-black text-white ml-auto' : 'bg-gray-50 text-gray-900 mr-auto border border-gray-100'}`}>
                              <div className="flex justify-between items-center mb-2 gap-4">
                                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-50 truncate">{msg.senderName}</span>
                                <span className="text-[7px] md:text-[8px] font-bold uppercase tracking-widest opacity-30 flex-shrink-0">{msg.date}</span>
                              </div>
                              <p className="text-xs md:text-sm font-medium leading-relaxed overflow-wrap-anywhere">{msg.content}</p>
                            </div>
                          ))
                        )}
                      </div>

                      <form onSubmit={handleSendReply} className="relative">
                        <textarea 
                          value={newThreadReply}
                          onChange={(e) => setNewThreadReply(e.target.value)}
                          placeholder="Type reply..."
                          className="w-full bg-white border border-gray-100 p-4 md:p-6 rounded-2xl md:rounded-3xl text-xs md:text-sm font-bold outline-none focus:border-primary resize-none placeholder:text-gray-300 h-28 md:h-32"
                        />
                        <button 
                          disabled={sendingReply}
                          className="absolute bottom-3 right-3 md:bottom-4 md:right-4 bg-primary text-black px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-headline font-black uppercase tracking-widest italic text-[10px] md:text-xs hover:brightness-90 disabled:opacity-50"
                        >
                          {sendingReply ? "SENDING" : "REPLY"}
                        </button>
                      </form>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-10 md:mb-12">
                        <Send className="w-5 h-5 text-primary" />
                        <h3 className="text-xs md:text-sm font-headline font-black uppercase tracking-tight">Open New Thread</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8 text-[10px] md:text-[11px] font-black uppercase text-gray-400 tracking-widest">
                        <p>Related Order</p>
                        <p className="hidden md:block">Inquiry Type</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-8">
                        <select 
                          value={newThreadForm.orderId}
                          onChange={(e) => setNewThreadForm(p => ({ ...p, orderId: e.target.value }))}
                          className="w-full bg-white border border-gray-100 p-4 md:p-5 rounded-2xl text-[10px] md:text-xs font-bold outline-none focus:border-primary appearance-none uppercase"
                        >
                          <option>General Print Labby Inquiry</option>
                          {orders.map(o => <option key={o.id}>Order #{o.id}</option>)}
                        </select>
                        <select 
                          value={newThreadForm.type}
                          onChange={(e) => setNewThreadForm(p => ({ ...p, type: e.target.value }))}
                          className="w-full bg-white border border-gray-100 p-4 md:p-5 rounded-2xl text-[10px] md:text-xs font-bold outline-none focus:border-primary appearance-none uppercase"
                        >
                          <option>General Inquiry</option>
                          <option>Artwork Assist</option>
                          <option>Logistics Delay</option>
                        </select>
                      </div>

                      <div className="mb-6 md:mb-8">
                        <label className="text-[10px] md:text-[11px] font-black uppercase text-gray-400 tracking-widest block mb-3 md:mb-4">Thread Subject</label>
                        <input 
                          type="text" 
                          value={newThreadForm.subject}
                          onChange={(e) => setNewThreadForm(p => ({ ...p, subject: e.target.value }))}
                          placeholder="e.g. Artwork bleed..."
                          className="w-full bg-white border border-gray-100 p-4 md:p-5 rounded-2xl text-[10px] md:text-xs font-bold outline-none focus:border-primary uppercase"
                        />
                      </div>

                      <div className="mb-8 md:mb-12">
                        <label className="text-[10px] md:text-[11px] font-black uppercase text-gray-400 tracking-widest block mb-3 md:mb-4">Message</label>
                        <textarea 
                          rows={4}
                          value={newThreadForm.message}
                          onChange={(e) => setNewThreadForm(p => ({ ...p, message: e.target.value }))}
                          placeholder="Describe the issue..."
                          className="w-full bg-white border border-gray-100 p-6 md:p-8 rounded-[24px] md:rounded-[32px] text-[10px] md:text-xs font-bold outline-none focus:border-primary resize-none uppercase"
                        />
                      </div>

                      <button 
                        onClick={handleInitiateThread}
                        className="w-full bg-primary/40 text-black py-5 md:py-6 rounded-2xl font-headline font-black uppercase tracking-widest text-sm md:text-base italic hover:bg-primary transition-all"
                      >
                        Initiate Resolution Thread —
                      </button>
                    </>
                  )}
                </div>

                <div className="lg:col-span-2 bg-[#0A0A0E] rounded-[32px] md:rounded-[40px] p-6 md:p-12 text-white relative shadow-2xl min-h-[300px] md:min-h-[400px]">
                  <header className="flex justify-between items-center mb-10 md:mb-12">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-500" />
                      <h3 className="text-[10px] md:text-xs font-headline font-black uppercase tracking-widest">Journal</h3>
                    </div>
                  </header>

                  <div className="space-y-8 md:space-y-10">
                    {threads.length === 0 ? (
                      <p className="text-[9px] md:text-[10px] font-black uppercase text-gray-600 text-center py-10 md:py-20">No active resolutions.</p>
                    ) : (
                      threads.map((thread) => (
                        <div key={thread.id} className="relative group cursor-pointer" onClick={() => thread.type === 'firestore' ? handleFetchMessages(thread) : setSelectedOrderId(thread.orderId)}>
                          <div className="flex items-center gap-2 mb-3 md:mb-4">
                            <span className="w-4 md:w-5 h-0.5 bg-gray-500 rounded-full" />
                            <span className={`text-[7px] md:text-[8px] font-black px-1.5 md:px-2 py-0.5 rounded uppercase ml-auto ${
                              thread.status === 'OPEN' ? 'bg-primary text-black' : (thread.status === 'REPLIED' ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-500')
                            }`}>{thread.status}</span>
                          </div>
                          <h4 className="text-base md:text-lg font-headline font-black italic tracking-tight mb-2 uppercase group-hover:text-primary transition-colors">
                            {thread.subject}
                          </h4>
                          <p className="text-[9px] md:text-[10px] text-gray-500 font-medium italic leading-relaxed mb-4 line-clamp-2">
                            {thread.message}
                          </p>
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-gray-700">{thread.date}</span>
                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                              View <ArrowRight className="w-2.5 md:w-3 h-2.5 md:h-3" />
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
              <header className="text-center mb-10 md:mb-16 px-4">
                <h1 className="text-4xl md:text-7xl font-headline font-black uppercase tracking-tighter italic leading-none mb-2">
                  System <span className="text-primary italic">Profile</span>
                </h1>
                <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest">Configuration for identity & logistics</p>
              </header>

              <div className="flex flex-col md:flex-row justify-center items-center gap-6 mb-10 md:mb-12 px-4">
                <div className="flex bg-white border border-gray-100 p-1.5 md:p-2 rounded-2xl w-full md:w-auto overflow-x-auto whitespace-nowrap scrollbar-none">
                  {['Identity', 'Logistics', 'Security'].map((t, i) => (
                    <button key={i} className={`flex-1 md:flex-none px-6 md:px-8 py-2.5 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest ${i === 0 ? 'bg-gray-50 text-gray-900 border border-gray-100' : 'text-gray-300'}`}>
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                  <button 
                    onClick={handleUpdateProfile}
                    className="flex-1 md:flex-none bg-primary text-black px-6 md:px-8 py-4 md:py-5 rounded-2xl font-black text-[10px] md:text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 md:gap-3 hover:opacity-90 shadow-lg shadow-primary/20"
                  >
                    <Package className="w-4 h-4" /> Save —
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="flex-1 md:flex-none bg-white border text-red-500 border-red-100 px-6 md:px-8 py-4 md:py-5 rounded-2xl font-black text-[10px] md:text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 md:gap-3 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" /> Exit
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-12">
                <div className="lg:col-span-3 bg-white border border-gray-50 rounded-[32px] md:rounded-[44px] p-6 md:p-14 shadow-sm">
                  <div className="flex items-center gap-3 mb-8 md:mb-10">
                    <div className="p-2 bg-primary/10 rounded-lg"><User className="w-4 h-4 text-primary" /></div>
                    <div>
                      <h3 className="text-base md:text-lg font-headline font-black uppercase tracking-tight italic">Profile Identity</h3>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 md:gap-x-12 gap-y-6 md:gap-y-10">
                    <div>
                      <label className="text-[10px] md:text-[11px] font-black uppercase text-gray-900 tracking-widest block mb-2 md:mb-4">First Name</label>
                      <input 
                        defaultValue={profile?.firstName || user?.displayName?.split(' ')[0] || ''}
                        className="w-full bg-gray-50 border border-gray-100 p-4 md:p-6 rounded-2xl text-xs md:text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] md:text-[11px] font-black uppercase text-gray-900 tracking-widest block mb-2 md:mb-4">Last Name</label>
                      <input 
                        defaultValue={profile?.lastName || user?.displayName?.split(' ').slice(1).join(' ') || ''}
                        className="w-full bg-gray-50 border border-gray-100 p-4 md:p-6 rounded-2xl text-xs md:text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] md:text-[11px] font-black uppercase text-gray-900 tracking-widest block mb-2 md:mb-4">Verified Email</label>
                      <input 
                        defaultValue={profile?.email || user?.email || ''}
                        className="w-full bg-transparent border-2 border-dotted border-gray-100 p-4 md:p-6 rounded-2xl text-xs md:text-sm font-bold text-gray-300 outline-none"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="text-[10px] md:text-[11px] font-black uppercase text-gray-900 tracking-widest block mb-2 md:mb-4">Phone</label>
                      <input 
                        defaultValue={profile?.phone}
                        className="w-full bg-gray-50 border border-gray-100 p-4 md:p-6 rounded-2xl text-xs md:text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all uppercase"
                      />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1 bg-[#0A0A0E] rounded-[32px] md:rounded-[44px] p-6 md:p-10 text-white shadow-2xl h-fit">
                  <h3 className="text-[11px] md:text-[12px] font-headline font-black uppercase tracking-[0.2em] mb-8 md:mb-12">Registry Data</h3>
                  <div className="space-y-6 md:space-y-8">
                    <div className="flex justify-between items-center text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                      <span className="text-gray-600">Joined</span>
                      <span className="flex-shrink-0 ml-4">{profile?.memberSince}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                      <span className="text-gray-600">Sync</span>
                      <span className="flex-shrink-0 ml-4">{profile?.lastSync}</span>
                    </div>
                    <div className="flex flex-col gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest pt-6 border-t border-white/5">
                      <span className="text-gray-600">Registry ID</span>
                      <span className="text-primary break-all">{profile?.registryId}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <header className="mb-8 md:mb-12 px-4">
                <h1 className="text-4xl md:text-6xl font-headline font-black uppercase tracking-tighter italic leading-none mb-2">
                  My <span className="text-primary">Reviews</span>
                </h1>
                <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest">History of your feedback and ratings</p>
              </header>

              {myReviews.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-[32px] md:rounded-[40px] p-10 md:p-20 text-center">
                  <MessageSquare className="w-12 h-12 md:w-16 md:h-16 text-gray-200 mx-auto mb-6" />
                  <h3 className="text-lg md:text-xl font-headline font-black uppercase mb-2 italic">Null Set</h3>
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-8">No feedback records found in registry.</p>
                  <button 
                    onClick={() => navigate('/')}
                    className="w-full md:w-auto bg-primary text-black px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-black/10"
                  >
                    Browse Lab —
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                  {myReviews.map((review) => (
                    <div key={review.id} className="bg-white border border-gray-100 rounded-[24px] md:rounded-[32px] p-6 md:p-10 hover:shadow-xl hover:shadow-gray-100 transition-all">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-1.5 md:gap-2">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 md:w-3.5 md:h-3.5 ${i < review.rating ? 'fill-[#FFD700] text-[#FFD700]' : 'text-gray-100'}`} 
                            />
                          ))}
                        </div>
                        <span className={`text-[7px] md:text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                          review.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>{review.status}</span>
                      </div>
                      
                      <div className="mb-6">
                        <Link to={`/product/${review.productId}`} className="text-xs md:text-sm font-black italic hover:text-primary transition-colors underline decoration-primary/30 underline-offset-4 uppercase">
                          Project Source Source
                        </Link>
                      </div>

                      <p className="text-xs md:text-sm text-gray-600 font-medium italic leading-relaxed mb-6">"{review.comment}"</p>
                      
                      <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                        <span className="text-[8px] md:text-[9px] font-black uppercase text-gray-300">{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}</span>
                        <button 
                          onClick={() => handleDeleteReview(review.id, review.productId)}
                          className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-red-500 hover:opacity-70"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}

function MapPin(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
