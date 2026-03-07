import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { StoreProfile, Product, Batch } from '../types';
import { MapPin, Search, Store, Navigation, Clock, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { Input, Badge, Card } from '../components/ui';
import { useNavigate } from 'react-router-dom';

// Haversine formula to calculate distance between two coordinates in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
}

const CATEGORIES = [
  'Pharmacy', 'Grocery', 'Electronics', 'Clothing', 
  'Hardware', 'Stationery', 'Bakery', 'Cosmetics'
];

interface VendorData {
  id: string;
  store: StoreProfile;
  products: Product[];
  batches: Batch[];
  distance?: number;
}

export default function ConsumerApp() {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showOnlyOpen, setShowOnlyOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          // Default location if denied (e.g., center of a city)
          setUserLocation({ lat: 28.6139, lng: 77.2090 }); // New Delhi
        }
      );
    } else {
      setUserLocation({ lat: 28.6139, lng: 77.2090 });
    }
  }, []);

  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true);
      try {
        // In a real app, we'd query a vendor_profiles table using a PostGIS RPC function to calculate distance.
        // e.g. const { data } = await supabase.rpc('get_nearby_vendors', { user_lat, user_lng });
        // Here we query the app_state table which contains the full state of each vendor and calculate in JS.
        const { data, error } = await supabase.from('app_state').select('id, data');
        
        if (error) throw error;
        
        if (data) {
          const parsedVendors: VendorData[] = data.map((row, index) => {
            const appData = row.data as any;
            const store = appData.store;
            
            // Mock location if missing (distribute them around New Delhi for demo)
            if (store && !store.location) {
              store.location = {
                lat: 28.6139 + (Math.random() - 0.5) * 0.1, // Random offset
                lng: 77.2090 + (Math.random() - 0.5) * 0.1
              };
            }

            return {
              id: row.id,
              store: store,
              products: appData.products || [],
              batches: appData.batches || []
            };
          }).filter(v => v.store); // Only keep those with a valid store profile
          
          setVendors(parsedVendors);
        }
      } catch (err) {
        console.error("Error fetching vendors:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  // Filter and sort vendors
  const processedVendors = vendors.map(vendor => {
    // Calculate distance if we have both locations
    let distance = 9999;
    if (userLocation && vendor.store.location) {
      distance = calculateDistance(
        userLocation.lat, userLocation.lng,
        vendor.store.location.lat, vendor.store.location.lng
      );
    }
    return { ...vendor, distance };
  })
  .filter(vendor => {
    // Availability Filter
    if (showOnlyOpen && !vendor.store.onlineOrdersEnabled) return false;
    
    // Category Filter
    if (selectedCategory && vendor.store.type !== selectedCategory) return false;
    
    // Smart Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      // Check store name
      if (vendor.store.name.toLowerCase().includes(query)) return true;
      
      // Check products in stock
      const hasMatchingProduct = vendor.products.some(product => {
        if (product.name.toLowerCase().includes(query) || 
            (product.category && product.category.toLowerCase().includes(query)) ||
            (product.subCategory && product.subCategory.toLowerCase().includes(query))) {
          
          // Check if this product has online stock
          const hasStock = vendor.batches.some(b => 
            b.productId === product.id && 
            b.onlineStatus === 'LIVE' && 
            (b.onlineStock || 0) > 0
          );
          return hasStock;
        }
        return false;
      });
      
      if (!hasMatchingProduct) return false;
    }
    
    return true;
  })
  .sort((a, b) => (a.distance || 0) - (b.distance || 0));

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-20 shadow-2xl relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-white p-4 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/')}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-black text-blue-600">UMPs Nearby</h1>
              <div className="flex items-center text-xs text-gray-500 mt-1">
                <MapPin size={12} className="mr-1 text-blue-500" />
                {userLocation ? 'Location Acquired' : 'Locating...'}
              </div>
            </div>
          </div>
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
            U
          </div>
        </div>

        {/* Unified Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search products, categories, or stores..."
            className="w-full pl-10 pr-4 py-3 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Availability Filter */}
        <div className="flex items-center justify-between bg-blue-50 p-3 rounded-xl border border-blue-100">
          <div className="flex items-center gap-2">
            <Store size={16} className="text-blue-600" />
            <span className="text-sm font-semibold text-blue-900">Show Only Open Shops</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={showOnlyOpen}
              onChange={(e) => setShowOnlyOpen(e.target.checked)}
            />
            <div className="w-9 h-5 bg-blue-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Category Quick-Links */}
        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-3">Categories</h2>
          <div className="grid grid-cols-4 gap-3">
            {CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                  selectedCategory === category 
                    ? 'bg-blue-600 text-white shadow-md scale-105' 
                    : 'bg-white text-gray-600 shadow-sm hover:bg-gray-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedCategory === category ? 'bg-white/20' : 'bg-blue-50 text-blue-600'
                }`}>
                  <Store size={18} />
                </div>
                <span className="text-[10px] font-bold text-center leading-tight">{category}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Vendor Cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">Nearby Vendors</h2>
            <span className="text-xs text-gray-500">{processedVendors.length} found</span>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Finding nearby stores...</p>
            </div>
          ) : processedVendors.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl shadow-sm border border-gray-100">
              <Store className="mx-auto mb-2 text-gray-300" size={48} />
              <p className="text-gray-500 font-medium">No vendors found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search</p>
            </div>
          ) : (
            <div className="space-y-4">
              {processedVendors.map(vendor => (
                <Card key={vendor.id} className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
                  <div className="h-32 bg-gray-200 relative">
                    {vendor.store.bannerUrl ? (
                      <img src={vendor.store.bannerUrl} className="w-full h-full object-cover" alt="Banner" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600"></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-md overflow-hidden border-2 border-white flex-shrink-0">
                          {vendor.store.logoUrl ? (
                            <img src={vendor.store.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                          ) : (
                            <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                              {vendor.store.name[0]}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-lg leading-tight drop-shadow-md">{vendor.store.name}</h3>
                          <p className="text-white/80 text-xs font-medium drop-shadow-md">{vendor.store.type}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
                      <Badge variant={vendor.store.onlineOrdersEnabled ? 'success' : 'danger'} className="shadow-sm">
                        {vendor.store.onlineOrdersEnabled ? 'Open' : 'Closed'}
                      </Badge>
                      {vendor.distance !== undefined && vendor.distance < 9999 && (
                        <Badge variant="default" className="bg-white/90 text-gray-800 border-none shadow-sm flex items-center gap-1">
                          <Navigation size={10} className="text-blue-600" />
                          {vendor.distance.toFixed(1)} km
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-white">
                    <div className="flex items-start gap-2 text-xs text-gray-600 mb-3">
                      <MapPin size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{vendor.store.address}</span>
                    </div>
                    
                    {/* Show matched products if searching */}
                    {searchQuery && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Matching Items in Stock</p>
                        <div className="flex flex-wrap gap-2">
                          {vendor.products
                            .filter(p => 
                              p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
                              (p.subCategory && p.subCategory.toLowerCase().includes(searchQuery.toLowerCase()))
                            )
                            .filter(p => vendor.batches.some(b => b.productId === p.id && b.onlineStatus === 'LIVE' && (b.onlineStock || 0) > 0))
                            .slice(0, 3)
                            .map(p => (
                              <span key={p.id} className="px-2 py-1 bg-green-50 text-green-700 rounded-md text-xs font-medium border border-green-100">
                                {p.name}
                              </span>
                            ))
                          }
                          {vendor.products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length > 3 && (
                            <span className="px-2 py-1 bg-gray-50 text-gray-500 rounded-md text-xs font-medium border border-gray-100">
                              +{vendor.products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
