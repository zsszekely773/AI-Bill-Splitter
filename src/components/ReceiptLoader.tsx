import React, { useState, useRef } from "react";
import { Upload, Camera, FileText, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { ParsedReceiptResponse } from "../types";

interface ReceiptLoaderProps {
  onParsingComplete: (data: ParsedReceiptResponse) => void;
  onSkipToManual: () => void;
}

export default function ReceiptLoader({ onParsingComplete, onSkipToManual }: ReceiptLoaderProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Resize and compress the image client-side to be responsive and highly efficient
  const processImageFile = (file: File) => {
    if (!file) return;
    
    // Quick validation
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, HEIC etc).");
      return;
    }

    setError(null);
    setLoading(true);
    setLoadingStep("Reading receipt photo...");

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // We compress the image to max 1200px width/height while keeping aspect ratio.
        // This keeps the base64 small and ensures Gemini receives lightweight yet clear data.
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
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

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85); // Compress to high-quality JPEG (85%)
          setImagePreview(compressedBase64);
          
          // Trigger matching API call
          sendToGemini(compressedBase64, "image/jpeg");
        } else {
          setLoading(false);
          setError("Failed to create rendering canvas for image compression.");
        }
      };
      
      img.onerror = () => {
        setLoading(false);
        setError("Selected image appears corrupted or unreadable.");
      };

      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    
    reader.onerror = () => {
      setLoading(false);
      setError("Failed to read the selected file.");
    };

    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  // Perform backend query
  const sendToGemini = async (base64Data: string, mimeType: string) => {
    try {
      setLoadingStep("Sending to AI Parser (Gemini)...");
      
      // We start a cyclical progression of loading messages for great UX
      const loadingInterval = setInterval(() => {
        const steps = [
          "Verifying receipt layouts...",
          "Decrypting receipt items and prices...",
          "Extracting sales taxes and service charges...",
          "Assembling interactive data...",
          "Almost ready! Finishing split sheet..."
        ];
        const randomStep = steps[Math.floor(Math.random() * steps.length)];
        setLoadingStep(randomStep);
      }, 3000);

      const rawBase64 = base64Data.split(",")[1]; // Remove prefix e.g 'data:image/jpeg;base64,'

      const response = await fetch("/api/analyze-receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: rawBase64,
          mimeType: mimeType,
        }),
      });

      clearInterval(loadingInterval);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to scan receipt photo. Please try another snapshot.");
      }

      const data: ParsedReceiptResponse = await response.json();
      
      // Alert completion
      onParsingComplete(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong while executing Gemini analysis.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" id="receipt-loader-panel">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#C0FF00]" />
          2. Scan Your Receipt
        </h2>
        <p className="text-xs text-zinc-400">
          Upload or frame a photo of your receipt. We will extract all items and prices instantly.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 border border-zinc-900 rounded-none relative overflow-hidden h-72">
          {imagePreview && (
            <div className="absolute inset-0 opacity-15 overflow-hidden animate-scan flex items-center justify-center">
              <img src={imagePreview} alt="Receipt preview background" className="object-cover w-full h-full filter blur-xs" />
            </div>
          )}

          <div className="relative z-10 text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-r-2 border-[#C0FF00] mx-auto font-mono"></div>
            <div className="space-y-1">
              <p className="font-bold text-white uppercase tracking-wider text-sm">Analyzing Snapshot...</p>
              <p className="text-xs text-[#C0FF00] font-mono animate-pulse">{loadingStep}</p>
            </div>
            <p className="text-[10px] text-zinc-500 max-w-xs mx-auto">
              Using server-side Gemini 3.5 Flash for high-precision, structural receipt processing.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Drag & Drop Canvas */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center p-8 border border-dashed rounded-none transition-all duration-200 cursor-pointer text-center text-zinc-400 bg-zinc-950/30 ${
              dragActive
                ? "border-[#C0FF00] bg-[#C0FF00]/5 text-[#C0FF00]"
                : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/10"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 text-zinc-600 mb-3" />
            
            <p className="text-sm font-bold uppercase tracking-wider text-white mb-1">
              Drag & drop receipt photo here
            </p>
            <p className="text-xs text-zinc-500 mb-4 px-4">
              or browse from your files (JPG, PNG, WebP)
            </p>
            
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-3.5 py-1.5 rounded-none text-xs font-bold uppercase tracking-widest bg-zinc-950 border border-zinc-850 text-zinc-300 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer"
              >
                Browse Files
              </button>
              
              {/* Specialized Mobile Camera snapshot button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cameraInputRef.current?.click();
                }}
                className="px-3.5 py-1.5 rounded-none text-xs font-bold uppercase tracking-widest bg-[#C0FF00]/10 border border-[#C0FF00]/30 text-[#C0FF00] hover:bg-[#C0FF00]/25 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5" />
                Take Photo
              </button>
            </div>

            {/* Hidden Input Selectors */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {/* Environment specific camera trigger */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Feedback alerts */}
          {error && (
            <div className="flex gap-2.5 p-3.5 border border-rose-950 bg-rose-950/20 text-rose-400 text-xs rounded-none">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold uppercase tracking-[0.1em] text-[10px]">Receipt scan issue</p>
                <p className="mt-1 leading-relaxed text-zinc-300">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-[10px] font-bold underline cursor-pointer hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Bypass manual layout buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-xs text-zinc-500 italic">
              Don't have a photo? Skip to register products manually.
            </p>
            
            <button
              type="button"
              onClick={onSkipToManual}
              className="w-full sm:w-auto px-4 py-2 text-xs font-black uppercase tracking-[0.2em] bg-zinc-950 border border-zinc-850 text-zinc-300 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              Start Manually
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
