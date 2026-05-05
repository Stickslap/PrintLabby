import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import toast from "react-hot-toast";
import axios from "axios";
import { ShieldCheck, ShieldAlert, Wifi, RefreshCcw } from "lucide-react";

export function AdminSettings() {
  const [settings, setSettings] = useState<any>({
    contactEmail: "support@printlabby.com",
    contactPhone: "817-602-2779",
    contactAddress: "HQ & Lab",
    officeHoursMonFri: "9:00 AM — 6:00 PM PST",
    officeHoursSat: "10:00 AM — 2:00 PM PST",
    officeHoursSun: "Closed",
    instagramUrl: "#",
    twitterUrl: "#",
    facebookUrl: "#",
    tiktokUrl: "#",
    youtubeUrl: "#",
    megaMenu: "",
    megaMenuCategories: "",
    footerLinks: "",
    notificationEmail: "support@printlabby.com",
    featuredProductId: "",
    shopAllCategoryId: "",
    searchVisibleProductIds: "",
    searchVisibleBlogIds: "",
    searchStrictFiltering: false,
    visibleBlogIds: ""
  });
  const [loading, setLoading] = useState(true);
  const [bcStatus, setBcStatus] = useState<{connected: boolean, message: string, storeName?: string, testing?: boolean}>({ connected: false, message: "Testing connection..." });
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [blogs, setBlogs] = useState<any[]>([]);

  const testBCConnection = async () => {
    setBcStatus(prev => ({ ...prev, testing: true }));
    try {
      const { data } = await axios.get("/api/health/bigcommerce");
      setBcStatus({ 
        connected: data.connected, 
        message: data.message || "Connection verified.",
        storeName: data.storeName,
        testing: false
      });
    } catch (err) {
      setBcStatus({ connected: false, message: "Server unreachable.", testing: false });
    }
  };

  useEffect(() => {
    testBCConnection();
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "global"));
        if (snap.exists()) {
          const data = JSON.parse(snap.data().content || "{}");
          setSettings((prev: any) => ({ ...prev, ...data }));
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, "settings");
      } finally {
        setLoading(false);
      }
    };
    const fetchProducts = async () => {
      try {
        const { data } = await axios.get("/api/products");
        if (data?.data) {
          setProducts(data.data);
        }
      } catch (err) {
        console.error("Failed to load products for settings");
      }
    };
    const fetchCategories = async () => {
      try {
        const { data } = await axios.get("/api/categories");
        if (data?.data) {
          setCategories(data.data.filter((c: any) => c.parent_id === 0));
        }
      } catch (err) {
        console.error("Failed to load categories for settings");
      }
    };
    const fetchJournals = async () => {
      try {
        const { data } = await axios.get("/api/journals");
        setJournals(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load journals for settings");
      }
    };
    const fetchBlogs = async () => {
      try {
        const { data } = await axios.get("/api/blogs");
        setBlogs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load blogs for settings");
      }
    };
    fetchSettings();
    fetchProducts();
    fetchCategories();
    fetchJournals();
    fetchBlogs();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const newSettings = {
      contactEmail: fd.get("contactEmail"),
      contactPhone: fd.get("contactPhone"),
      contactAddress: fd.get("contactAddress"),
      officeHoursMonFri: fd.get("officeHoursMonFri"),
      officeHoursSat: fd.get("officeHoursSat"),
      officeHoursSun: fd.get("officeHoursSun"),
      instagramUrl: fd.get("instagramUrl"),
      twitterUrl: fd.get("twitterUrl"),
      facebookUrl: fd.get("facebookUrl"),
      tiktokUrl: fd.get("tiktokUrl"),
      youtubeUrl: fd.get("youtubeUrl"),
      megaMenu: fd.get("megaMenu"),
      megaMenuCategories: fd.get("megaMenuCategories"),
      footerLinks: fd.get("footerLinks"),
      notificationEmail: fd.get("notificationEmail"),
      featuredProductId: fd.get("featuredProductId"),
      shopAllCategoryId: fd.get("shopAllCategoryId"),
      searchVisibleProductIds: settings.searchVisibleProductIds,
      searchVisibleBlogIds: settings.searchVisibleBlogIds,
      searchStrictFiltering: settings.searchStrictFiltering,
      visibleBlogIds: settings.visibleBlogIds,
    };

    try {
      await setDoc(doc(db, "settings", "global"), {
        type: "global",
        content: JSON.stringify(newSettings),
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      toast.success("Settings saved");
      setSettings(newSettings);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "settings");
      toast.error("Failed to save settings");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* BigCommerce Connection Status */}
      <div className={`border rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-all ${bcStatus.connected ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${bcStatus.connected ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
            {bcStatus.connected ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-headline font-black italic uppercase text-lg tracking-tight leading-none">
              BigCommerce: {bcStatus.connected ? 'Live' : 'Disconnected'}
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">
              {bcStatus.connected ? (
                <span>Linked Store: {bcStatus.storeName} <span className="mx-2 opacity-30">|</span> <span className="opacity-60">{bcStatus.message}</span></span>
              ) : bcStatus.message}
            </p>
          </div>
        </div>

        <button 
          onClick={testBCConnection}
          disabled={bcStatus.testing}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${bcStatus.testing ? 'animate-spin' : ''}`} />
          {bcStatus.testing ? 'Syncing...' : 'Run Diagnostics'}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-8">
        <h2 className="font-headline font-black italic uppercase text-2xl mb-8">Global Site Settings</h2>
      <form onSubmit={handleSave} className="space-y-6">
        <h3 className="font-bold uppercase tracking-widest text-sm border-b pb-2 mb-4">Contact Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Public Display Email</label>
            <input name="contactEmail" defaultValue={settings.contactEmail} className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Notification Email (Admin Alerts)</label>
            <input name="notificationEmail" defaultValue={settings.notificationEmail} className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Phone</label>
            <input name="contactPhone" defaultValue={settings.contactPhone} className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">HQ / Address Details</label>
          <input name="contactAddress" defaultValue={settings.contactAddress} className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
        </div>
        
        <h3 className="font-bold uppercase tracking-widest text-sm border-b pb-2 mb-4 mt-6">Office Hours</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Mon - Fri</label>
            <input name="officeHoursMonFri" defaultValue={settings.officeHoursMonFri} className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Saturday</label>
            <input name="officeHoursSat" defaultValue={settings.officeHoursSat} className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Sunday</label>
            <input name="officeHoursSun" defaultValue={settings.officeHoursSun} className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>

        <h3 className="font-bold uppercase tracking-widest text-sm border-b pb-2 mb-4 mt-6">Homepage / Storefront</h3>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Featured Product</label>
          <select 
            name="featuredProductId" 
            defaultValue={settings.featuredProductId || ""} 
            className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-white"
          >
            <option value="">None</option>
            {products.map(p => (
              <option key={p.id} value={p.id.toString()}>{p.name}</option>
            ))}
          </select>
        </div>

        <h3 className="font-bold uppercase tracking-widest text-sm border-b pb-2 mb-4 mt-6">Display & Search Protocols</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">"Shop All" Default Category</label>
            <select 
              name="shopAllCategoryId" 
              defaultValue={settings.shopAllCategoryId || ""} 
              className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-white"
            >
              <option value="">All Categories (Standard)</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>
              ))}
            </select>
            <p className="text-[9px] text-gray-400 mt-2 uppercase font-bold tracking-widest">When users click "SHOP ALL", they will be restricted to this category.</p>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input 
                type="checkbox"
                checked={settings.searchStrictFiltering}
                onChange={(e) => setSettings({ ...settings, searchStrictFiltering: e.target.checked })}
                className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300"
              />
              <span className="text-xs font-bold uppercase tracking-widest text-gray-900">Enable Restricted Search</span>
            </label>
            <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest leading-relaxed">If enabled, ONLY the items selected below will appear in search results across the site.</p>
          </div>
        </div>

        {settings.searchStrictFiltering && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">Searchable Products Whitelist</label>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {products.map(p => (
                  <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={settings.searchVisibleProductIds?.split(',').includes(p.id.toString())}
                      onChange={(e) => {
                        const current = settings.searchVisibleProductIds ? settings.searchVisibleProductIds.split(',') : [];
                        const next = e.target.checked 
                          ? [...current, p.id.toString()]
                          : current.filter((id: string) => id !== p.id.toString());
                        setSettings({ ...settings, searchVisibleProductIds: next.join(',') });
                      }}
                      className="w-3.5 h-3.5 rounded text-primary border-gray-300" 
                    />
                    <span className="text-[11px] font-bold uppercase text-gray-600 group-hover:text-black">{p.name} <span className="opacity-30 ml-2">SKU: {p.sku}</span></span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">Searchable Journal Entries Whitelist</label>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {journals.map(j => (
                  <label key={j.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={settings.searchVisibleBlogIds?.split(',').includes(j.id.toString())}
                      onChange={(e) => {
                        const current = settings.searchVisibleBlogIds ? settings.searchVisibleBlogIds.split(',') : [];
                        const next = e.target.checked 
                          ? [...current, j.id.toString()]
                          : current.filter((id: string) => id !== j.id.toString());
                        setSettings({ ...settings, searchVisibleBlogIds: next.join(',') });
                      }}
                      className="w-3.5 h-3.5 rounded text-primary border-gray-300" 
                    />
                    <span className="text-[11px] font-bold uppercase text-gray-600 group-hover:text-black">{j.title}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <h3 className="font-bold uppercase tracking-widest text-sm border-b pb-2 mb-4 mt-6">Journal Visibility Control</h3>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Visible Blogs (Root containers)</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {blogs.map(blog => (
              <label key={blog.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary transition-all cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={!settings.visibleBlogIds || settings.visibleBlogIds.split(',').includes(blog.id.toString())}
                  onChange={(e) => {
                    // Default to all being visible if visibleBlogIds is empty/unset
                    const currentString = settings.visibleBlogIds || blogs.map(b => b.id).join(',');
                    const current = currentString.split(',');
                    const next = e.target.checked 
                      ? [...current, blog.id.toString()]
                      : current.filter((id: string) => id !== blog.id.toString());
                    setSettings({ ...settings, visibleBlogIds: next.join(',') });
                  }}
                  className="w-5 h-5 rounded text-primary border-gray-300"
                />
                <div>
                  <span className="block text-sm font-black uppercase italic">{blog.name}</span>
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">
                    ID: {blog.id} • {blog.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </label>
            ))}
          </div>
          <p className="text-[9px] text-gray-400 mt-2 uppercase font-bold tracking-widest">Select which main blogs appear on the Journal page. Useful if you have multiple brands or sub-blogs.</p>
        </div>

        <h3 className="font-bold uppercase tracking-widest text-sm border-b pb-2 mb-4 mt-6">Socials</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Instagram URL</label>
            <input name="instagramUrl" defaultValue={settings.instagramUrl} className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Twitter URL</label>
            <input name="twitterUrl" defaultValue={settings.twitterUrl} className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Facebook URL</label>
            <input name="facebookUrl" defaultValue={settings.facebookUrl} className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">TikTok URL</label>
            <input name="tiktokUrl" defaultValue={settings.tiktokUrl} className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">YouTube URL</label>
            <input name="youtubeUrl" defaultValue={settings.youtubeUrl} className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>

        <h3 className="font-bold uppercase tracking-widest text-sm border-b pb-2 mb-4 mt-6">Menus</h3>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Display Categories in Mega Menu</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 border border-gray-100 rounded-xl p-4 bg-gray-50/30">
            {categories.map(cat => (
              <label key={cat.id} className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  value={cat.id}
                  checked={settings.megaMenuCategories?.split(',').includes(cat.id.toString())}
                  onChange={(e) => {
                    const current = settings.megaMenuCategories ? settings.megaMenuCategories.split(',') : [];
                    const next = e.target.checked 
                      ? [...current, cat.id.toString()]
                      : current.filter((id: string) => id !== cat.id.toString());
                    setSettings({ ...settings, megaMenuCategories: next.join(',') });
                  }}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300"
                />
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 group-hover:text-black transition-colors">{cat.name}</span>
              </label>
            ))}
            {categories.length === 0 && <p className="text-[10px] text-gray-400 italic">No categories found in store</p>}
          </div>
          <input type="hidden" name="megaMenuCategories" value={settings.megaMenuCategories || ""} />
          <p className="text-[9px] text-gray-400 mt-2 uppercase font-bold tracking-widest">Selected categories will be prominently displayed in the main navigation mega menu.</p>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Mega Menu external Links</label>
          <textarea
            name="megaMenu"
            defaultValue={settings.megaMenu}
            placeholder="Format: Label, URL (one per line)"
            rows={3}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Footer Links</label>
          <textarea
            name="footerLinks"
            defaultValue={settings.footerLinks}
            placeholder="Format: Label, URL (one per line)"
            rows={3}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm"
          />
        </div>
        
        <button type="submit" className="bg-primary text-black px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-primary transition-colors w-full mt-4">
          Save All Settings
        </button>
      </form>
    </div>
  </div>
);
}
