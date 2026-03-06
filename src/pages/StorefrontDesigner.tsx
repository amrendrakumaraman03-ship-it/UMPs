import React, { useState, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { Button, Input, Card, Badge } from '../components/ui';
import { 
  Image as ImageIcon, 
  Upload, 
  Layout, 
  Palette, 
  Check, 
  Eye, 
  Plus, 
  X, 
  MessageSquare, 
  Send,
  MapPin,
  Clock,
  Phone,
  Info,
  ChevronRight,
  ArrowLeft,
  Smartphone,
  ShoppingCart,
  User
} from 'lucide-react';
import { VendorPost } from '../types';

const FACILITIES_OPTIONS = [
  'Home Delivery',
  'In-store Pickup',
  'Parking Available',
  'Wheelchair Accessible',
  'Open 24/7',
  'Digital Payments',
  'Air Conditioned',
  'Trial Room'
];

export default function StorefrontDesigner() {
  const { store, updateStoreProfile, vendorPosts, addVendorPost } = useStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'feed' | 'theme'>('profile');
  const [showPreview, setShowPreview] = useState(false);
  
  // Profile State
  const [bio, setBio] = useState(store?.bio || '');
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(store?.facilities || []);
  
  // Feed State
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme State
  const [primaryColor, setPrimaryColor] = useState(store?.primaryColor || '#2563eb');

  if (!store) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateStoreProfile({ logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateStoreProfile({ bannerUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleFacility = (facility: string) => {
    setSelectedFacilities(prev => 
      prev.includes(facility) 
        ? prev.filter(f => f !== facility) 
        : [...prev, facility]
    );
  };

  const saveProfile = () => {
    updateStoreProfile({
      bio,
      facilities: selectedFacilities
    });
  };

  const handlePostImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPostImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = () => {
    if (!postContent.trim()) return;
    addVendorPost({
      content: postContent,
      imageUrl: postImage || undefined
    });
    setPostContent('');
    setPostImage(null);
  };

  const saveTheme = () => {
    updateStoreProfile({ primaryColor });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Storefront Designer</h1>
          <p className="text-gray-500">Customize how your shop appears to customers online</p>
        </div>
        <Button 
          onClick={() => setShowPreview(true)}
          className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100"
        >
          <Eye size={18} className="mr-2" />
          View My Storefront
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'profile' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Layout size={18} />
          Profile
        </button>
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'feed' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <MessageSquare size={18} />
          Feed
        </button>
        <button
          onClick={() => setActiveTab('theme')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'theme' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Palette size={18} />
          Theme
        </button>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-6">
              <h3 className="font-bold text-lg border-b pb-2">Visual Identity</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Store Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group">
                      {store.logoUrl ? (
                        <img src={store.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                      ) : (
                        <ImageIcon className="text-gray-400" size={24} />
                      )}
                      <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                        <Upload className="text-white" size={20} />
                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                      </label>
                    </div>
                    <div className="text-xs text-gray-500">
                      <p className="font-semibold text-gray-700">Square Logo</p>
                      <p>Recommended: 512x512px</p>
                      <p>PNG or JPG</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Hero Banner</label>
                  <div className="w-full h-32 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group">
                    {store.bannerUrl ? (
                      <img src={store.bannerUrl} className="w-full h-full object-cover" alt="Banner" />
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="text-gray-400 mx-auto mb-1" size={24} />
                        <span className="text-xs text-gray-500">Upload Banner Image</span>
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <Upload className="text-white" size={24} />
                      <input type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} />
                    </label>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">Recommended: 1200x400px (3:1 ratio)</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-6">
              <h3 className="font-bold text-lg border-b pb-2">Store Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">About Our Shop</label>
                  <textarea
                    className="w-full h-32 p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                    placeholder="Tell your customers about your shop, history, and values..."
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Facilities</label>
                  <div className="flex flex-wrap gap-2">
                    {FACILITIES_OPTIONS.map(facility => (
                      <button
                        key={facility}
                        onClick={() => toggleFacility(facility)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          selectedFacilities.includes(facility)
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {facility}
                      </button>
                    ))}
                  </div>
                </div>

                <Button className="w-full" onClick={saveProfile}>
                  Save Profile Settings
                </Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'feed' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* Composer */}
              <Card className="p-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {store.name[0]}
                  </div>
                  <div className="flex-1 space-y-3">
                    <textarea
                      className="w-full p-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 resize-none text-sm min-h-[100px]"
                      placeholder="What's new in your shop? Share an update, offer, or new arrival..."
                      value={postContent}
                      onChange={e => setPostContent(e.target.value)}
                    />
                    
                    {postImage && (
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden group">
                        <img src={postImage} className="w-full h-full object-cover" alt="Post preview" />
                        <button 
                          onClick={() => setPostImage(null)}
                          className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors text-sm font-medium"
                      >
                        <ImageIcon size={18} />
                        Attach Image
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/*" 
                          onChange={handlePostImageUpload} 
                        />
                      </button>
                      <Button 
                        size="sm" 
                        disabled={!postContent.trim()}
                        onClick={handleCreatePost}
                      >
                        <Send size={16} className="mr-2" />
                        Post Update
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Feed List */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 px-1">Recent Updates</h3>
                {vendorPosts.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                    <MessageSquare className="mx-auto text-gray-300 mb-2" size={32} />
                    <p className="text-gray-500 text-sm">No updates posted yet.</p>
                  </div>
                ) : (
                  vendorPosts.map(post => (
                    <Card key={post.id} className="overflow-hidden">
                      <div className="p-4 flex items-center gap-3 border-b border-gray-50">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                          {store.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{store.name}</p>
                          <p className="text-[10px] text-gray-400">{new Date(post.createdAt).toLocaleDateString()} • {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.content}</p>
                      </div>
                      {post.imageUrl && (
                        <div className="w-full aspect-video">
                          <img src={post.imageUrl} className="w-full h-full object-cover" alt="Post" />
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-6">
              <Card className="p-4 bg-blue-50 border-blue-100">
                <div className="flex items-start gap-3">
                  <Info className="text-blue-600 mt-1" size={20} />
                  <div>
                    <h4 className="font-bold text-blue-900 text-sm">Feed Composer</h4>
                    <p className="text-xs text-blue-700 mt-1">
                      Posts appear on your store's "Feed" tab. Use them to announce sales, new stock, or holiday hours.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'theme' && (
          <div className="max-w-md mx-auto">
            <Card className="p-6 space-y-6">
              <h3 className="font-bold text-lg border-b pb-2">Theme Customization</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Primary Brand Color</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      className="w-16 h-16 rounded-xl border-none cursor-pointer p-0 overflow-hidden"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                    />
                    <div className="flex-1">
                      <Input 
                        value={primaryColor} 
                        onChange={e => setPrimaryColor(e.target.value)}
                        className="font-mono uppercase"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">This color will be used for buttons, icons, and accents on your storefront.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Preview Elements</p>
                  <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                    <div className="flex gap-2">
                      <button 
                        className="px-4 py-2 rounded-lg text-white text-sm font-medium shadow-sm"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Primary Button
                      </button>
                      <button 
                        className="px-4 py-2 rounded-lg text-sm font-medium border"
                        style={{ borderColor: primaryColor, color: primaryColor }}
                      >
                        Outline Button
                      </button>
                    </div>
                    <div className="flex gap-4">
                      <div style={{ color: primaryColor }}><ImageIcon size={24} /></div>
                      <div style={{ color: primaryColor }}><Layout size={24} /></div>
                      <div style={{ color: primaryColor }}><Palette size={24} /></div>
                    </div>
                  </div>
                </div>

                <Button className="w-full" onClick={saveTheme}>
                  Apply Theme Colors
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Mobile Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 lg:p-8 overflow-hidden">
          <div className="relative w-full max-w-[380px] h-full max-h-[760px] bg-white rounded-[3rem] border-[8px] border-gray-900 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Phone Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-50"></div>
            
            {/* Preview Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50 scrollbar-hide">
              {/* Hero Banner */}
              <div className="relative h-48 w-full bg-gray-200">
                {store.bannerUrl ? (
                  <img src={store.bannerUrl} className="w-full h-full object-cover" alt="Banner" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <ImageIcon className="text-gray-300" size={48} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                
                {/* Back Button */}
                <button className="absolute top-8 left-4 w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                  <ArrowLeft size={18} />
                </button>
              </div>

              {/* Store Info Header */}
              <div className="px-4 -mt-10 relative z-10">
                <div className="bg-white rounded-2xl shadow-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="w-16 h-16 rounded-xl bg-white border-2 border-white shadow-md -mt-10 overflow-hidden">
                      {store.logoUrl ? (
                        <img src={store.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                      ) : (
                        <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold text-2xl">
                          {store.name[0]}
                        </div>
                      )}
                    </div>
                    <Badge variant="success" className="bg-green-100 text-green-700 border-none">Open Now</Badge>
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-gray-900">{store.name}</h2>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={10} /> {store.address}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      className="flex-1 py-2 rounded-lg text-white text-xs font-bold shadow-sm"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Shop Now
                    </button>
                    <button 
                      className="px-3 py-2 rounded-lg border flex items-center justify-center"
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      <Phone size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Facilities Horizontal Scroll */}
              <div className="mt-6">
                <div className="flex items-center justify-between px-4 mb-3">
                  <h3 className="font-bold text-gray-900 text-sm">Facilities</h3>
                </div>
                <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
                  {selectedFacilities.length > 0 ? selectedFacilities.map(f => (
                    <div key={f} className="flex-shrink-0 bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                        <Check size={14} />
                      </div>
                      <span className="text-[10px] font-bold text-gray-700 whitespace-nowrap">{f}</span>
                    </div>
                  )) : (
                    <p className="text-xs text-gray-400 italic">No facilities listed</p>
                  )}
                </div>
              </div>

              {/* About Section */}
              <div className="mt-6 px-4">
                <h3 className="font-bold text-gray-900 text-sm mb-2">About Our Shop</h3>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {bio || "Welcome to our shop! We provide high-quality products and services to our customers. Visit us today for a great experience."}
                  </p>
                </div>
              </div>

              {/* Feed Preview */}
              <div className="mt-6 px-4 pb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900 text-sm">Latest Updates</h3>
                  <button className="text-[10px] font-bold" style={{ color: primaryColor }}>View All</button>
                </div>
                <div className="space-y-4">
                  {vendorPosts.length > 0 ? vendorPosts.slice(0, 2).map(post => (
                    <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-3 flex items-center gap-2 border-b border-gray-50">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[10px]">
                          {store.name[0]}
                        </div>
                        <span className="text-[10px] font-bold text-gray-900">{store.name}</span>
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] text-gray-600 line-clamp-2">{post.content}</p>
                      </div>
                      {post.imageUrl && (
                        <div className="w-full aspect-video">
                          <img src={post.imageUrl} className="w-full h-full object-cover" alt="Post" />
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="text-center py-6 bg-white rounded-2xl border border-dashed border-gray-200">
                      <p className="text-[10px] text-gray-400">No updates yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Nav Bar (Preview) */}
            <div className="h-16 bg-white border-t border-gray-100 flex items-center justify-around px-4">
              <div className="flex flex-col items-center gap-1" style={{ color: primaryColor }}>
                <Smartphone size={18} />
                <span className="text-[8px] font-bold">Store</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-gray-400">
                <ShoppingCart size={18} />
                <span className="text-[8px] font-bold">Cart</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-gray-400">
                <User size={18} />
                <span className="text-[8px] font-bold">Account</span>
              </div>
            </div>
          </div>

          {/* Close Preview Button */}
          <button 
            onClick={() => setShowPreview(false)}
            className="absolute top-4 right-4 lg:top-8 lg:right-8 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all shadow-2xl border border-white/20"
          >
            <X size={24} />
          </button>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 text-xs font-medium flex items-center gap-2">
            <Smartphone size={14} />
            Mobile Storefront Preview
          </div>
        </div>
      )}
    </div>
  );
}
