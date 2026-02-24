import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Button, Card, Input, Badge } from '../components/ui';
import { Camera, Upload, Check, X, Loader2, FileText, ArrowRight, Save } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { Batch, Product } from '../types';

// Initialize Gemini Client
// Note: In a real app, this should be backend-proxied or use a secure key management strategy.
// For this demo, we assume the environment variable is available.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function InvoiceUpload() {
  const navigate = useNavigate();
  const { addProduct, addBatch, products } = useStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = async (file: File) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        alert("Gemini API Key is missing. Please configure it in your environment variables.");
        return;
    }

    setIsProcessing(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];

        try {
            const model = "gemini-flash-latest";
            const prompt = `
            Analyze this pharmacy invoice image. Extract product details into a JSON array.
            For each item, extract:
            - productName (string)
            - batchNumber (string)
            - expiryDate (YYYY-MM-DD format)
            - quantity (number)
            - mrp (number)
            - purchaseRate (number)
            - gstRate (number, infer if missing, usually 12 or 18)
            
            Return ONLY the JSON array.
            `;

            const result = await ai.models.generateContent({
                model: model,
                contents: {
                    parts: [
                        { inlineData: { mimeType: file.type, data: base64Data } },
                        { text: prompt }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
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
      };
    } catch (error) {
      console.error("File Error:", error);
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImage(e.target.files[0]);
    }
  };

  const handleSaveItem = (item: any) => {
    // Check if product exists
    let productId = products.find(p => p.name.toLowerCase() === item.productName.toLowerCase())?.id;

    if (!productId) {
      // Create new product
      const newProduct = addProduct({
        code: 'AUTO-' + Math.floor(Math.random() * 10000),
        name: item.productName,
        category: 'Uncategorized',
        unit: 'pcs',
        gstRate: item.gstRate || 12,
        minStockAlert: 10
      });
      productId = newProduct?.id; // Assuming addProduct returns the product now (we fixed this earlier)
    }

    if (productId) {
        // Create Batch
        addBatch({
            productId: productId,
            batchNumber: item.batchNumber || 'BATCH-' + Math.floor(Math.random() * 1000),
            manufacturingDate: '', // Optional
            expiryDate: item.expiryDate,
            purchaseRate: item.purchaseRate,
            mrp: item.mrp,
            stock: item.quantity
        });

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
                <Button className="flex-1" onClick={() => fileInputRef.current?.click()}>
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
                <Button className="flex-1" variant="outline" onClick={() => fileInputRef.current?.click()}>
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
                            <div className="col-span-12 sm:col-span-4">
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

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-end gap-3 z-10">
                <Button variant="outline" onClick={() => navigate('/inventory')}>Cancel</Button>
                <Button onClick={handleSaveAll} className="bg-green-600 hover:bg-green-700 text-white">
                    Save All to Inventory
                </Button>
            </div>
            <div className="h-16"></div> {/* Spacer for fixed footer */}
        </div>
      )}
    </div>
  );
}
