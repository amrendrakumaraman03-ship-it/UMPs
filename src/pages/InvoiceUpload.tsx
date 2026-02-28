import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Button, Card, Input, Badge } from '../components/ui';
import { Camera, Upload, Check, X, Loader2, FileText, ArrowRight, Save } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { Batch, Product } from '../types';
import { supabase } from '../lib/supabase';

// Initialize Gemini Client safely
const getGenAI = () => {
  try {
    // Try to get key from process.env (Vite replacement) or import.meta.env
    const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
    if (!apiKey) {
      console.warn("Gemini API Key is missing or empty.");
      return null;
    }
    return new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error("Error initializing Gemini client:", e);
    return null;
  }
};

export default function InvoiceUpload() {
  const navigate = useNavigate();
  const { addProduct, addBatch, products } = useStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          // Compress to JPEG with 0.6 quality for faster transmission
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve(dataUrl.split(',')[1]);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const processImage = async (file: File) => {
    const ai = getGenAI();
    if (!ai) {
        alert("Gemini API Key is missing or invalid. Please check your configuration.");
        return;
    }

    setIsProcessing(true);
    try {
      let base64Data: string;
      let mimeType: string;

      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        // Handle PDF: No resizing, just read as base64
        mimeType = 'application/pdf';
        base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                // Handle cases where readAsDataURL might not include the prefix correctly or different browsers
                if (result.includes(',')) {
                    resolve(result.split(',')[1]);
                } else {
                    resolve(result);
                }
            };
            reader.onerror = reject;
        });
      } else {
        // Handle Image: Resize and compress
        mimeType = 'image/jpeg';
        base64Data = await resizeImage(file);
      }

      try {
            // Use gemini-3-flash-preview for fast and precise extraction
            const model = "gemini-3-flash-preview";
            
            // Simplified prompt for faster processing - relying on schema for structure
            const prompt = `Extract invoice line items. Map columns: 
            - drugCode: 'Drug Code' col OR extract from 'Product Name' (e.g. text in parentheses like '(FG00017)').
            - productName: 'Item Name' or 'Product Name'.
            - batchNumber: 'Batch No' or 'Batch'.
            - expiryDate: 'Exp Date' or 'Exp'. Convert MM/YY to YYYY-MM-DD (last day of month).
            - purchaseRate: 'Rate'.
            - gstRate: 'GST %' or 'GST Rate'.
            - quantity: 'Sold Qty' or 'Qty'.
            - mrp: 'MRP'.`;

            const result = await ai.models.generateContent({
                model: model,
                contents: {
                    parts: [
                        { inlineData: { mimeType: mimeType, data: base64Data } },
                        { text: prompt }
                    ]
                },
                config: {
                    systemInstruction: "You are a fast, highly precise OCR assistant. Extract invoice data into the exact requested JSON schema without any extra text or reasoning.",
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                drugCode: { type: Type.STRING },
                                productName: { type: Type.STRING },
                                batchNumber: { type: Type.STRING },
                                expiryDate: { type: Type.STRING },
                                quantity: { type: Type.NUMBER },
                                mrp: { type: Type.NUMBER },
                                purchaseRate: { type: Type.NUMBER },
                                gstRate: { type: Type.NUMBER }
                            }
                        }
                    }
                }
            });

            const text = result.text;
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                // Fallback parsing if JSON is wrapped in markdown
                const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
                data = JSON.parse(jsonStr);
            }
            
            if (!Array.isArray(data)) {
                // Handle case where model returns object with key like "items": [...]
                if (data.items && Array.isArray(data.items)) {
                    data = data.items;
                } else {
                    throw new Error("Invalid response format");
                }
            }
            
            // Add temporary IDs
            const itemsWithIds = data.map((item: any) => ({
                ...item,
                tempId: Math.random().toString(36).substr(2, 9),
                status: 'pending' // pending, saved, error
            }));
            
            setScannedItems(itemsWithIds);
            setStep('review');
        } catch (error) {
            console.error("Gemini Error:", error);
            alert("Failed to extract data. Please try again or enter manually.");
        } finally {
            setIsProcessing(false);
        }
    } catch (error) {
      console.error("File Error:", error);
      alert("Error processing file. Please try a different file.");
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault(); // Prevent any default form submission
    if (e.target.files && e.target.files[0]) {
      processImage(e.target.files[0]);
    }
    // Reset input value to allow selecting same file again
    e.target.value = '';
  };

  const handleSaveItem = async (item: any) => {
    // Check if product exists locally
    let productId = products.find(p => p.name.toLowerCase() === item.productName.toLowerCase())?.id;

    if (!productId) {
      // Create new product locally
      const newProduct = addProduct({
        code: item.drugCode || ('AUTO-' + Math.floor(Math.random() * 10000)),
        name: item.productName,
        category: 'Uncategorized',
        unit: 'pcs',
        gstRate: item.gstRate || 12,
        minStockAlert: 10
      });
      productId = newProduct?.id;
    }

    if (productId) {
        // Create Batch locally
        addBatch({
            productId: productId,
            batchNumber: item.batchNumber || 'BATCH-' + Math.floor(Math.random() * 1000),
            manufacturingDate: '',
            expiryDate: item.expiryDate,
            purchaseRate: item.purchaseRate,
            mrp: item.mrp,
            stock: item.quantity
        });

        // Save directly to Supabase 'inventory' table
        try {
            await supabase.from('inventory').insert({
                drug_code: item.drugCode || ('AUTO-' + Math.floor(Math.random() * 10000)),
                product_name: item.productName,
                batch_number: item.batchNumber || 'BATCH-' + Math.floor(Math.random() * 1000),
                expiry_date: item.expiryDate,
                purchase_rate: item.purchaseRate,
                mrp: item.mrp,
                qty_offline: item.quantity,
                qty_online: 0,
                gst_rate: item.gstRate || 12
            });
        } catch (err) {
            console.error("Error saving to Supabase inventory:", err);
        }

        // Update local state to show saved
        setScannedItems(prev => prev.map(i => i.tempId === item.tempId ? { ...i, status: 'saved' } : i));
    }
  };

  const handleSaveAll = () => {
    scannedItems.forEach(item => {
        if (item.status !== 'saved') {
            handleSaveItem(item);
        }
    });
    navigate('/inventory');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Invoice Entry</h2>
        {step === 'review' && (
            <Button variant="outline" size="sm" onClick={() => setStep('upload')}>
                Scan New
            </Button>
        )}
      </div>

      {step === 'upload' && (
        <Card className="p-8 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-4 bg-gray-50">
          {isProcessing ? (
            <div className="text-center">
              <Loader2 className="animate-spin mx-auto text-blue-600 mb-2" size={48} />
              <p className="text-gray-600 font-medium">Analyzing Invoice...</p>
              <p className="text-xs text-gray-400">Extracting product data with AI</p>
            </div>
          ) : (
            <>
              <div className="p-4 bg-blue-100 rounded-full text-blue-600">
                <FileText size={48} />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-lg text-gray-900">Upload Invoice</h3>
                <p className="text-sm text-gray-500">Take a photo or upload PDF/Image</p>
              </div>
              <div className="flex gap-3 w-full max-w-xs">
                <Button type="button" className="flex-1" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={18} className="mr-2" /> Upload
                </Button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                />
                {/* Camera would need specific mobile implementation or getUserMedia, sticking to file upload for PWA compat */}
                <Button type="button" className="flex-1" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Camera size={18} className="mr-2" /> Camera
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {step === 'review' && (
        <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="font-bold text-blue-800 mb-1">Review Extracted Data</h3>
                <p className="text-sm text-blue-600">
                    We found {scannedItems.length} items. Please verify details before saving to Offline Inventory.
                </p>
            </div>

            <div className="space-y-3">
                {scannedItems.map((item, index) => (
                    <Card key={item.tempId} className={`p-4 ${item.status === 'saved' ? 'border-green-500 bg-green-50' : ''}`}>
                        <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-12 sm:col-span-1">
                                <label className="text-xs text-gray-500">Code</label>
                                <Input 
                                    value={item.drugCode || ''} 
                                    onChange={(e) => {
                                        const newVal = e.target.value;
                                        setScannedItems(prev => prev.map(i => i.tempId === item.tempId ? { ...i, drugCode: newVal, status: 'pending' } : i));
                                    }}
                                    className="h-8 text-sm px-1"
                                    placeholder="Code"
                                />
                            </div>
                            <div className="col-span-12 sm:col-span-3">
                                <label className="text-xs text-gray-500">Product Name</label>
                                <Input 
                                    value={item.productName} 
                                    onChange={(e) => {
                                        const newVal = e.target.value;
                                        setScannedItems(prev => prev.map(i => i.tempId === item.tempId ? { ...i, productName: newVal, status: 'pending' } : i));
                                    }}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="col-span-6 sm:col-span-2">
                                <label className="text-xs text-gray-500">Batch</label>
                                <Input 
                                    value={item.batchNumber} 
                                    onChange={(e) => {
                                        const newVal = e.target.value;
                                        setScannedItems(prev => prev.map(i => i.tempId === item.tempId ? { ...i, batchNumber: newVal, status: 'pending' } : i));
                                    }}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="col-span-6 sm:col-span-2">
                                <label className="text-xs text-gray-500">Expiry</label>
                                <Input 
                                    type="date"
                                    value={item.expiryDate} 
                                    onChange={(e) => {
                                        const newVal = e.target.value;
                                        setScannedItems(prev => prev.map(i => i.tempId === item.tempId ? { ...i, expiryDate: newVal, status: 'pending' } : i));
                                    }}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="col-span-4 sm:col-span-1">
                                <label className="text-xs text-gray-500">Qty</label>
                                <Input 
                                    type="number"
                                    value={item.quantity} 
                                    onChange={(e) => {
                                        const newVal = Number(e.target.value);
                                        setScannedItems(prev => prev.map(i => i.tempId === item.tempId ? { ...i, quantity: newVal, status: 'pending' } : i));
                                    }}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="col-span-4 sm:col-span-2">
                                <label className="text-xs text-gray-500">MRP</label>
                                <Input 
                                    type="number"
                                    value={item.mrp} 
                                    onChange={(e) => {
                                        const newVal = Number(e.target.value);
                                        setScannedItems(prev => prev.map(i => i.tempId === item.tempId ? { ...i, mrp: newVal, status: 'pending' } : i));
                                    }}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="col-span-4 sm:col-span-1 flex items-end justify-end">
                                {item.status === 'saved' ? (
                                    <div className="h-8 w-8 flex items-center justify-center bg-green-100 text-green-600 rounded-full">
                                        <Check size={18} />
                                    </div>
                                ) : (
                                    <Button size="sm" className="h-8 w-8 p-0" onClick={() => handleSaveItem(item)}>
                                        <Save size={16} />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-end gap-3 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <Button variant="outline" onClick={() => navigate('/inventory')}>Cancel</Button>
                <Button onClick={handleSaveAll} className="bg-green-600 hover:bg-green-700 text-white">
                    Save All to Inventory
                </Button>
            </div>
            <div className="h-40"></div> {/* Spacer for fixed footer + nav bar */}
        </div>
      )}
    </div>
  );
}
