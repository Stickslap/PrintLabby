import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Instagram, X, Loader2 } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const SocialPopup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [handle, setHandle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    // Show popup after 3 seconds if not already shown in this session
    const hasShown = sessionStorage.getItem('social_popup_shown');
    if (!hasShown) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('social_popup_shown', 'true');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) return;

    setIsSubmitting(true);
    try {
      const path = 'instagram_handles';
      await addDoc(collection(db, path), {
        handle: handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`,
        createdAt: serverTimestamp(),
        userId: auth.currentUser?.uid || null,
        email: auth.currentUser?.email || null
      });
      setIsSubmitted(true);
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'instagram_handles');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-[#12071f] rounded-[32px] overflow-hidden relative border border-white/10 shadow-2xl"
          >
            <button 
              onClick={handleClose}
              className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="p-8 md:p-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center mb-6 shadow-lg shadow-pink-500/20">
                <Instagram className="w-10 h-10 text-white" strokeWidth={1.5} />
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-white mb-3 tracking-tight">
                Share Your Instagram Handle
              </h2>
              
              <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-8">
                We love to tag our customers for recognition and exposure to their brand when we feature our work on Instagram.
              </p>

              {isSubmitted ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 w-full"
                >
                  <p className="text-green-400 font-bold">Awesome! We'll tag you soon. ✨</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="w-full space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                      <Instagram className="w-5 h-5 text-white/30 group-focus-within:text-white/60 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="yourhandle"
                      className="w-full bg-white/5 border-2 border-white/10 focus:border-[#6228d7] rounded-full py-4 pl-14 pr-6 text-white text-lg placeholder:text-white/20 outline-none transition-all"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#fdd835] hover:bg-[#ffe066] text-[#12071f] font-black py-4 rounded-full text-lg uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/10"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      'Submit'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-white/40 hover:text-white text-sm font-medium transition-colors"
                  >
                    No thanks
                  </button>
                </form>
              )}
            </div>

            {/* Background Accent */}
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#6228d7]/20 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#ee2a7b]/20 blur-[100px] rounded-full pointer-events-none" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SocialPopup;
