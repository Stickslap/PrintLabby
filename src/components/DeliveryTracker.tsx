
import React, { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';
import { getDeliveryTargetDate, getTimeRemaining } from '../lib/deliveryUtils';

interface DeliveryTrackerProps {
  orderDate: string | Date;
  timeframe?: string;
  className?: string;
}

export function DeliveryTracker({ orderDate, timeframe = "7-10 business days", className = "" }: DeliveryTrackerProps) {
  const targetDate = getDeliveryTargetDate(orderDate, timeframe);
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const formatOptions: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };

  if (timeLeft.total <= 0) {
    return (
      <div className={`p-4 bg-emerald-50 border border-emerald-100 rounded-2xl ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase text-emerald-800 tracking-widest leading-none mb-1">Expected Delivery</h4>
            <p className="text-sm font-bold text-emerald-600">{targetDate.toLocaleDateString(undefined, formatOptions)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Date Display */}
      <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-0.5">Exact Delivery Date</h4>
            <p className="text-lg font-headline font-black italic tracking-tighter text-black">
              {targetDate.toLocaleDateString(undefined, formatOptions)}
            </p>
          </div>
        </div>
      </div>

      {/* Countdown Display */}
      <div className="p-5 bg-black rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-4 h-4 text-primary animate-pulse" />
          <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Time Remaining Until Delivery</h4>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'DAYS', value: timeLeft.days },
            { label: 'HRS', value: timeLeft.hours },
            { label: 'MIN', value: timeLeft.minutes },
            { label: 'SEC', value: timeLeft.seconds }
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <span className="text-2xl font-headline font-black italic text-white leading-none">
                {String(item.value).padStart(2, '0')}
              </span>
              <span className="text-[8px] font-black text-gray-600 tracking-wider mt-1">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
