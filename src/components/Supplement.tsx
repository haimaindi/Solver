import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ExternalLink, Sparkles, Pill, Loader2 } from 'lucide-react';
import { GlassCard, Badge } from './UI';
import { ASSETS } from '../assets';

interface SupplementItem {
  title: string;
  description: string;
  thumbnail: string;
  link: string;
}

export function Supplement() {
  const [items, setItems] = useState<SupplementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(ASSETS.SUPPLEMENT_SHEET_URL);
      const csvText = await response.text();
      
      // Simple CSV parser (assuming standard format: Title, Description, Thumbnail, Link)
      const rows = csvText.split('\n').slice(1); // Skip header
      const parsedData: SupplementItem[] = rows
        .map(row => {
          // Handle potential commas inside quotes if needed, but simple split for now
          const columns = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          if (columns.length < 4) return null;
          
          return {
            title: columns[0]?.replace(/^"|"$/g, '').trim() || '',
            description: columns[1]?.replace(/^"|"$/g, '').trim() || '',
            thumbnail: columns[2]?.replace(/^"|"$/g, '').trim() || '',
            link: columns[3]?.replace(/^"|"$/g, '').trim() || ''
          };
        })
        .filter((item): item is SupplementItem => item !== null && item.title !== '');

      setItems(parsedData);
    } catch (error) {
      console.error('Error fetching supplement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLink = (url: string) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-bca-blue animate-spin" />
        <p className="text-slate-500 font-medium">Loading supplements...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center">
          <Pill className="w-12 h-12 text-slate-200" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-slate-900">Coming Soon</h3>
          <p className="text-slate-500 mt-2 max-w-md">We are currently curating the best resources for your growth. Check back later!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Supplement Resources</h2>
        <p className="text-slate-500 mt-1">Curated tools and materials to accelerate your problem-solving journey.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <GlassCard 
              className="group h-full flex flex-col overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-bca-blue/10 transition-all duration-500 border-slate-100"
              onClick={() => handleOpenLink(item.link)}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <img 
                  src={item.thumbnail || 'https://picsum.photos/seed/supplement/800/600'} 
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-4">
                  <Badge variant="Success" className="bg-white/20 backdrop-blur-md text-white border-white/30">
                    View Resource
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col flex-grow space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-bold text-slate-900 leading-tight group-hover:text-bca-blue transition-colors line-clamp-2">
                    {item.title}
                  </h4>
                </div>
                
                <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 flex-grow">
                  {item.description}
                </p>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
