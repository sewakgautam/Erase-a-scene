import { useState, useRef, useEffect } from "react";
import {
  Upload,
  Download,
  Zap,
  Sparkles,
  Link,
  X,
  Moon,
  Sun,
  Clock,
  Share2,
  Palette,
  Trash2,
  Copy,
  Check,
  GripVertical,
} from "lucide-react";
import { ACCESSKEY } from "./config.ts";

// --- Types ---

interface HistoryItem {
  id: string;
  originalUrl: string;
  processedUrl: string;
  timestamp: number;
  fileName?: string;
}

interface ApiError extends Error {
  status?: number;
}

// --- Constants ---

const MAX_FILE_SIZE = 12 * 1024 * 1024;
const MAX_HISTORY = 20;
const CHECKERBOARD = `url("data:image/svg+xml,%3csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='10' height='10' fill='%23e5e7eb'/%3e%3crect x='10' y='10' width='10' height='10' fill='%23e5e7eb'/%3e%3c/svg%3e")`;
const MOD_KEY = typeof navigator !== "undefined" && navigator.platform?.includes("Mac") ? "⌘" : "Ctrl+";

// --- Helpers ---

function friendlyError(status: number): string {
  const map: Record<number, string> = {
    400: "Invalid image. Please provide a valid image file or URL.",
    402: "API credits exhausted. Please check your Remove.bg account.",
    403: "Invalid API key. Please check your configuration.",
    429: "Too many requests. Please wait a moment and try again.",
    413: "Image too large. Maximum size is 12MB.",
  };
  return map[status] || `Something went wrong (Error ${status}). Please try again.`;
}

function createThumbnail(src: string, maxW = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (src.startsWith("http")) img.crossOrigin = "anonymous";
    img.onload = () => {
      const s = Math.min(1, maxW / img.naturalWidth);
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * s);
      c.height = Math.round(img.naturalHeight * s);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/webp", 0.8));
    };
    img.onerror = () => reject(new Error("Thumbnail failed"));
    img.src = src;
  });
}

// --- Component ---

function App(): JSX.Element {
  // Core state
  const [imagelink, setImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestLink, setRequestlink] = useState("");
  const [finalImage, setFinalImage] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [inputMethod, setInputMethod] = useState<"url" | "file">("url");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feature state
  const [previewUrl, setPreviewUrl] = useState("");
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("darkMode") === "true"
  );
  const [bgMode, setBgMode] = useState<"transparent" | "color">("transparent");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [sliderPos, setSliderPos] = useState(50);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("processingHistory") || "[]");
    } catch {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState(false);
  const [processedCount, setProcessedCount] = useState(
    () => parseInt(localStorage.getItem("processedCount") || "0")
  );
  const [downloadFormat, setDownloadFormat] = useState<"png" | "webp" | "jpg">(
    "png"
  );
  const [fileName, setFileName] = useState("background-removed");
  const [copied, setCopied] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const dm = darkMode;

  // --- Effects ---

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dm);
    localStorage.setItem("darkMode", String(dm));
  }, [dm]);

  // Clipboard paste
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            setUploadedFile(file);
            setInputMethod("file");
            setImage("");
            setFinalImage("");
            setError("");
          }
          break;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        setImage("");
        setUploadedFile(null);
        setFinalImage("");
        setRequestlink("");
        setError("");
        setInputMethod("url");
        setSliderPos(50);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Preview URL for file uploads (with cleanup)
  useEffect(() => {
    if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    if (inputMethod === "file") setPreviewUrl("");
  }, [uploadedFile, inputMethod]);

  // Preview for URL input
  useEffect(() => {
    if (inputMethod === "url") setPreviewUrl(imagelink || "");
  }, [imagelink, inputMethod]);

  // Cleanup blob URLs on change
  useEffect(() => {
    const url = requestLink;
    return () => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    };
  }, [requestLink]);

  useEffect(() => {
    const url = finalImage;
    return () => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    };
  }, [finalImage]);

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem("processingHistory", JSON.stringify(history));
    } catch {
      if (history.length > 5) setHistory((h) => h.slice(0, 5));
    }
  }, [history]);

  // Persist count
  useEffect(() => {
    localStorage.setItem("processedCount", String(processedCount));
  }, [processedCount]);

  // --- Core Logic ---

  function bgremove() {
    if (inputMethod === "url" && !imagelink) {
      setError("Please enter an image URL");
      return;
    }
    if (inputMethod === "file" && !uploadedFile) {
      setError("Please select an image file");
      return;
    }
    if (uploadedFile && uploadedFile.size > MAX_FILE_SIZE) {
      setError(
        `File too large (${(uploadedFile.size / 1024 / 1024).toFixed(1)}MB). Maximum is 12MB.`
      );
      return;
    }
    if (!ACCESSKEY) {
      setError("API key not configured. Set VITE_ACCESS_KEY in your .env file.");
      return;
    }

    setLoading(true);
    setError("");
    setSliderPos(50);

    if (inputMethod === "url") {
      setRequestlink(imagelink);
      removeBackground("url", imagelink);
    } else if (uploadedFile) {
      setRequestlink(URL.createObjectURL(uploadedFile));
      removeBackground("file", uploadedFile);
    }
  }

  async function removeBackground(mode: "url" | "file", input: string | File) {
    const fd = new FormData();
    fd.append("size", "auto");
    fd.append(mode === "url" ? "image_url" : "image_file", input);

    try {
      const res = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": ACCESSKEY },
        body: fd,
      });

      if (res.ok) {
        const blob = await res.blob();
        const resultUrl = URL.createObjectURL(blob);
        setFinalImage(resultUrl);
        if (mode === "url") setImage("");
        else setUploadedFile(null);
        setProcessedCount((c) => c + 1);

        // Save to history
        try {
          const processedThumb = await createThumbnail(resultUrl);
          let origUrl: string;
          if (mode === "url") {
            origUrl = input as string;
          } else {
            const fileUrl = URL.createObjectURL(input as File);
            origUrl = await createThumbnail(fileUrl);
            URL.revokeObjectURL(fileUrl);
          }
          setHistory((h) =>
            [
              {
                id: Date.now().toString(),
                originalUrl: origUrl,
                processedUrl: processedThumb,
                timestamp: Date.now(),
                fileName: mode === "file" ? (input as File).name : undefined,
              },
              ...h,
            ].slice(0, MAX_HISTORY)
          );
        } catch {
          /* history save failed, ok */
        }
      } else {
        const err: ApiError = new Error(friendlyError(res.status));
        err.status = res.status;
        throw err;
      }
    } catch (err) {
      console.error("Error:", err);
      setError(
        err instanceof Error && (err as ApiError).status
          ? err.message
          : "Failed to remove background. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // --- Event Handlers ---

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    setError("");
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) {
      setUploadedFile(f);
      setInputMethod("file");
      setImage("");
      setFinalImage("");
    } else {
      setError("Please drop an image file (JPG, PNG, WebP).");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f?.type.startsWith("image/")) {
      setUploadedFile(f);
      setInputMethod("file");
      setImage("");
      setFinalImage("");
      setError("");
    } else if (f) {
      setError("Please select an image file (JPG, PNG, WebP).");
    }
  };

  const downloadImage = async () => {
    if (!finalImage) return;
    try {
      const img = new window.Image();
      img.src = finalImage;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        if (img.complete && img.naturalWidth > 0) resolve();
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;

      if (bgMode === "color") {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (downloadFormat === "jpg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      const types: Record<string, string> = {
        png: "image/png",
        webp: "image/webp",
        jpg: "image/jpeg",
      };

      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${fileName || "background-removed"}.${downloadFormat}`;
          a.click();
          URL.revokeObjectURL(url);
        },
        types[downloadFormat],
        downloadFormat === "png" ? undefined : 0.92
      );
    } catch {
      // Fallback: direct download
      const a = document.createElement("a");
      a.href = finalImage;
      a.download = `${fileName || "background-removed"}.png`;
      a.click();
    }
  };

  const copyToClipboard = async () => {
    if (!finalImage) return;
    try {
      const r = await fetch(finalImage);
      const blob = await r.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy to clipboard.");
    }
  };

  const shareImage = async () => {
    if (!finalImage) return;
    try {
      const r = await fetch(finalImage);
      const blob = await r.blob();
      const file = new File([blob], `background-removed.${downloadFormat}`, {
        type: blob.type,
      });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Background Removed" });
      } else {
        await copyToClipboard();
      }
    } catch {
      setError("Sharing failed. Try downloading instead.");
    }
  };

  const resetForm = () => {
    setImage("");
    setUploadedFile(null);
    setFinalImage("");
    setRequestlink("");
    setError("");
    setInputMethod("url");
    setSliderPos(50);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const switchToURL = () => {
    setInputMethod("url");
    setUploadedFile(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const switchToFile = () => {
    setInputMethod("file");
    setImage("");
    setError("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") bgremove();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const stopPropagation = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openFileDialog = () => fileInputRef.current?.click();

  // Before/After slider
  const handleSliderStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();

    const getX = (ev: MouseEvent | TouchEvent) =>
      "touches" in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX;

    const update = (ev: MouseEvent | TouchEvent) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(getX(ev) - rect.left, rect.width));
      setSliderPos((x / rect.width) * 100);
    };

    const end = () => {
      document.removeEventListener("mousemove", update);
      document.removeEventListener("mouseup", end);
      document.removeEventListener("touchmove", update);
      document.removeEventListener("touchend", end);
    };

    document.addEventListener("mousemove", update);
    document.addEventListener("mouseup", end);
    document.addEventListener("touchmove", update);
    document.addEventListener("touchend", end);

    // Set initial position
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const x0 =
        "touches" in e.nativeEvent
          ? (e.nativeEvent as TouchEvent).touches[0].clientX
          : (e.nativeEvent as MouseEvent).clientX;
      const x = Math.max(0, Math.min(x0 - rect.left, rect.width));
      setSliderPos((x / rect.width) * 100);
    }
  };

  // History
  const loadFromHistory = (item: HistoryItem) => {
    setRequestlink(item.originalUrl);
    setFinalImage(item.processedUrl);
    setShowHistory(false);
    setError("");
    setSliderPos(50);
  };

  const removeFromHistory = (id: string) => {
    setHistory((h) => h.filter((item) => item.id !== id));
  };

  const clearHistory = () => setHistory([]);

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  // --- JSX ---

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        dm
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
          : "bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100"
      }`}
    >
      {/* ── Header ── */}
      <header
        className={`${
          dm ? "bg-gray-800/80 border-gray-700" : "bg-white/80 border-white/20"
        } backdrop-blur-md shadow-sm border-b sticky top-0 z-50`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Erase-a-Scene
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              <nav className="hidden md:flex space-x-6 mr-2">
                <a
                  href="#features"
                  onClick={scrollTo("features")}
                  className={`${
                    dm
                      ? "text-gray-300 hover:text-purple-400"
                      : "text-gray-600 hover:text-purple-600"
                  } font-medium transition-colors`}
                >
                  Features
                </a>
              </nav>

              {/* History */}
              <button
                onClick={() => setShowHistory(true)}
                className={`relative p-2 rounded-lg transition-colors ${
                  dm
                    ? "hover:bg-gray-700 text-gray-300"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
                title="Processing History"
              >
                <Clock className="w-5 h-5" />
                {history.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center">
                    {history.length}
                  </span>
                )}
              </button>

              {/* Dark mode toggle */}
              <button
                onClick={() => setDarkMode(!dm)}
                className={`p-2 rounded-lg transition-colors ${
                  dm
                    ? "hover:bg-gray-700 text-yellow-400"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
                title={dm ? "Switch to light mode" : "Switch to dark mode"}
              >
                {dm ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Usage counter */}
              {processedCount > 0 && (
                <div
                  className={`hidden sm:flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${
                    dm
                      ? "bg-purple-900/50 text-purple-300"
                      : "bg-purple-100 text-purple-700"
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span>{processedCount} processed</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        {/* Hero */}
        <div className="text-center mb-12">
          <h2
            className={`text-4xl md:text-6xl font-bold ${
              dm ? "text-white" : "text-gray-900"
            } mb-6`}
          >
            Remove Background
            <span className="block bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              in 5 seconds
            </span>
          </h2>
          <p
            className={`text-xl ${
              dm ? "text-gray-400" : "text-gray-600"
            } mb-8 max-w-2xl mx-auto`}
          >
            100% automatically – in just one click. Upload your photo now and
            see the magic happen!
          </p>
        </div>

        {/* ── Upload Section ── */}
        <div
          className={`${
            dm ? "bg-gray-800 border-gray-700" : "bg-white border-white/20"
          } rounded-2xl shadow-2xl p-8 mb-8 border`}
        >
          {/* Tab Toggle */}
          <div className="flex justify-center mb-6">
            <div className={`${dm ? "bg-gray-700" : "bg-gray-100"} p-1 rounded-lg`}>
              <button
                onClick={switchToURL}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  inputMethod === "url"
                    ? dm
                      ? "bg-gray-600 text-purple-400 shadow-sm"
                      : "bg-white text-purple-600 shadow-sm"
                    : dm
                    ? "text-gray-400 hover:text-purple-400"
                    : "text-gray-600 hover:text-purple-600"
                }`}
              >
                <Link className="w-4 h-4 inline mr-2" />
                URL
              </button>
              <button
                onClick={switchToFile}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  inputMethod === "file"
                    ? dm
                      ? "bg-gray-600 text-purple-400 shadow-sm"
                      : "bg-white text-purple-600 shadow-sm"
                    : dm
                    ? "text-gray-400 hover:text-purple-400"
                    : "text-gray-600 hover:text-purple-600"
                }`}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Upload
              </button>
            </div>
          </div>

          {inputMethod === "url" ? (
            /* URL Input */
            <div className="space-y-4">
              <div className="text-center">
                <h3
                  className={`text-xl font-semibold ${
                    dm ? "text-white" : "text-gray-900"
                  } mb-2`}
                >
                  Enter Image URL
                </h3>
                <p className={`${dm ? "text-gray-400" : "text-gray-600"} mb-6`}>
                  Paste a direct link to your image
                </p>
              </div>
              <div className="max-w-md mx-auto">
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="url"
                    value={imagelink}
                    onChange={(e) => setImage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="https://example.com/image.jpg"
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200 ${
                      dm
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                        : "border-gray-300 text-gray-900"
                    }`}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* File Upload */
            <div
              className={`border-2 border-dashed rounded-xl p-8 transition-all duration-300 cursor-pointer ${
                dragOver
                  ? "border-purple-400 bg-purple-500/10"
                  : dm
                  ? "border-gray-600 hover:border-purple-400 hover:bg-purple-900/10"
                  : "border-gray-300 hover:border-purple-400 hover:bg-purple-50/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={openFileDialog}
            >
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                {uploadedFile ? (
                  <div className="space-y-2">
                    <h3
                      className={`text-xl font-semibold ${
                        dm ? "text-white" : "text-gray-900"
                      }`}
                    >
                      File Selected
                    </h3>
                    <p className={dm ? "text-gray-400" : "text-gray-600"}>
                      {uploadedFile.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      onClick={stopPropagation}
                      className="text-red-500 hover:text-red-700 font-medium"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div>
                    <h3
                      className={`text-xl font-semibold ${
                        dm ? "text-white" : "text-gray-900"
                      } mb-2`}
                    >
                      Upload an image
                    </h3>
                    <p
                      className={`${
                        dm ? "text-gray-400" : "text-gray-600"
                      } mb-4`}
                    >
                      Drag and drop an image here, or click to select
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports JPG, PNG, WebP up to 12MB
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Image Preview */}
          {previewUrl && !finalImage && !loading && (
            <div className="mt-6">
              <h4
                className={`text-sm font-medium ${
                  dm ? "text-gray-400" : "text-gray-500"
                } mb-2 text-center`}
              >
                Preview
              </h4>
              <div
                className={`max-w-xs mx-auto rounded-xl overflow-hidden ${
                  dm ? "bg-gray-700" : "bg-gray-100"
                }`}
              >
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-48 object-contain"
                  onError={() => inputMethod === "url" && setPreviewUrl("")}
                />
              </div>
            </div>
          )}

          {/* Paste hint */}
          <p
            className={`text-center text-sm mt-4 ${
              dm ? "text-gray-500" : "text-gray-400"
            }`}
          >
            Tip: Paste an image from clipboard ({MOD_KEY}V)
          </p>

          {/* Error */}
          {error && (
            <div
              className={`mt-4 p-4 rounded-lg border ${
                dm
                  ? "bg-red-900/20 border-red-800"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center">
                <X className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                <p className={dm ? "text-red-400" : "text-red-700"}>{error}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <button
              onClick={bgremove}
              disabled={
                loading ||
                (inputMethod === "url" && !imagelink) ||
                (inputMethod === "file" && !uploadedFile)
              }
              className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
                loading ||
                (inputMethod === "url" && !imagelink) ||
                (inputMethod === "file" && !uploadedFile)
                  ? dm
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transform hover:scale-105 shadow-lg hover:shadow-xl"
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>Remove Background</span>
                </>
              )}
            </button>

            {(finalImage || uploadedFile || imagelink) && (
              <button
                onClick={resetForm}
                className={`px-6 py-3 border rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
                  dm
                    ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <X className="w-5 h-5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div
            className={`${
              dm ? "bg-gray-800 border-gray-700" : "bg-white border-white/20"
            } rounded-2xl shadow-xl p-8 border mb-8`}
          >
            <div className="text-center">
              <div className="relative mx-auto w-20 h-20 mb-6">
                <div
                  className={`absolute inset-0 rounded-full border-4 ${
                    dm ? "border-purple-900" : "border-purple-200"
                  }`}
                ></div>
                <div className="absolute inset-0 rounded-full border-4 border-purple-600 border-t-transparent animate-spin"></div>
                <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-purple-600" />
              </div>
              <h3
                className={`text-xl font-semibold ${
                  dm ? "text-white" : "text-gray-900"
                } mb-2`}
              >
                AI is working its magic...
              </h3>
              <p className={dm ? "text-gray-400" : "text-gray-600"}>
                Removing background with pixel-perfect precision
              </p>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {finalImage && !loading && (
          <div
            className={`${
              dm ? "bg-gray-800 border-gray-700" : "bg-white border-white/20"
            } rounded-2xl shadow-xl p-8 border mb-8`}
          >
            <div className="text-center mb-6">
              <h3
                className={`text-2xl font-bold ${
                  dm ? "text-white" : "text-gray-900"
                } mb-2`}
              >
                🎉 Background Removed!
              </h3>
              <p className={dm ? "text-gray-400" : "text-gray-600"}>
                Drag the slider to compare before and after
              </p>
            </div>

            {/* Before / After Slider */}
            <div
              ref={sliderRef}
              className="relative w-full h-96 overflow-hidden rounded-xl select-none cursor-ew-resize mb-6"
              onMouseDown={handleSliderStart}
              onTouchStart={handleSliderStart}
            >
              {/* After (processed) – bottom layer */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor:
                    bgMode === "color" ? bgColor : undefined,
                  backgroundImage:
                    bgMode === "transparent" ? CHECKERBOARD : undefined,
                  backgroundSize:
                    bgMode === "transparent" ? "20px 20px" : undefined,
                }}
              >
                <img
                  src={finalImage}
                  alt="After"
                  className="w-full h-full object-contain"
                  draggable={false}
                />
              </div>

              {/* Before (original) – top layer with clip */}
              <div
                className="absolute inset-0"
                style={{
                  clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
                }}
              >
                <div
                  className={`w-full h-full ${
                    dm ? "bg-gray-900" : "bg-gray-200"
                  }`}
                >
                  <img
                    src={requestLink}
                    alt="Before"
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                </div>
              </div>

              {/* Slider handle */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white"
                style={{
                  left: `${sliderPos}%`,
                  transform: "translateX(-50%)",
                  boxShadow: "0 0 8px rgba(0,0,0,0.4)",
                }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <GripVertical className="w-5 h-5 text-gray-500" />
                </div>
              </div>

              {/* Labels */}
              <div className="absolute top-3 left-3 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium pointer-events-none">
                Before
              </div>
              <div className="absolute top-3 right-3 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium pointer-events-none">
                After
              </div>
            </div>

            {/* Options Row */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
              {/* File name */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm ${
                    dm ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Name:
                </span>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value.replace(/[\\/:*?"<>|]/g, ""))}
                  placeholder="background-removed"
                  className={`px-3 py-1.5 rounded-lg text-sm border w-44 ${
                    dm
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>

              {/* Background mode */}
              <div className="flex items-center gap-2">
                <Palette
                  className={`w-4 h-4 ${
                    dm ? "text-gray-400" : "text-gray-500"
                  }`}
                />
                <select
                  value={bgMode}
                  onChange={(e) =>
                    setBgMode(e.target.value as "transparent" | "color")
                  }
                  className={`px-3 py-1.5 rounded-lg text-sm border ${
                    dm
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                >
                  <option value="transparent">Transparent</option>
                  <option value="color">Custom Color</option>
                </select>
                {bgMode === "color" && (
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0"
                  />
                )}
              </div>

              {/* Download format */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm ${
                    dm ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Format:
                </span>
                <select
                  value={downloadFormat}
                  onChange={(e) =>
                    setDownloadFormat(e.target.value as "png" | "webp" | "jpg")
                  }
                  className={`px-3 py-1.5 rounded-lg text-sm border ${
                    dm
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                >
                  <option value="png">PNG</option>
                  <option value="webp">WebP</option>
                  <option value="jpg">JPG</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={downloadImage}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transform hover:scale-105 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
              >
                <Download className="w-5 h-5" />
                <span>Download {downloadFormat.toUpperCase()}</span>
              </button>
              <button
                onClick={copyToClipboard}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center space-x-2 ${
                  copied
                    ? dm
                      ? "bg-green-900/30 text-green-400"
                      : "bg-green-100 text-green-700"
                    : dm
                    ? "bg-gray-700 text-white hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <button
                onClick={shareImage}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center space-x-2 ${
                  dm
                    ? "bg-gray-700 text-white hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Share2 className="w-5 h-5" />
                <span>Share</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Features Section ── */}
        <div id="features" className="text-center mb-12 scroll-mt-24">
          <h3
            className={`text-3xl font-bold ${
              dm ? "text-white" : "text-gray-900"
            } mb-4`}
          >
            Why choose Erase-a-Scene?
          </h3>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {[
            {
              icon: <Zap className="w-6 h-6 text-purple-600" />,
              bg: dm ? "bg-purple-900/50" : "bg-purple-100",
              title: "Lightning Fast",
              desc: "Process images in seconds with our advanced AI technology.",
            },
            {
              icon: <Sparkles className="w-6 h-6 text-blue-600" />,
              bg: dm ? "bg-blue-900/50" : "bg-blue-100",
              title: "AI Precision",
              desc: "Pixel-perfect results with advanced machine learning algorithms.",
            },
            {
              icon: <Download className="w-6 h-6 text-green-600" />,
              bg: dm ? "bg-green-900/50" : "bg-green-100",
              title: "HD Quality",
              desc: "Download high-resolution images without watermarks.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className={`text-center p-6 ${
                dm ? "bg-gray-800/60 border-gray-700" : "bg-white/60 border-white/20"
              } backdrop-blur-sm rounded-2xl border`}
            >
              <div
                className={`w-12 h-12 ${f.bg} rounded-xl flex items-center justify-center mx-auto mb-4`}
              >
                {f.icon}
              </div>
              <h4
                className={`text-xl font-semibold ${
                  dm ? "text-white" : "text-gray-900"
                } mb-2`}
              >
                {f.title}
              </h4>
              <p className={dm ? "text-gray-400" : "text-gray-600"}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── History Sidebar ── */}
      {showHistory && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowHistory(false)}
        />
      )}
      <div
        className={`fixed inset-y-0 right-0 w-80 max-w-full transform transition-transform duration-300 z-50 ${
          showHistory ? "translate-x-0" : "translate-x-full"
        } ${
          dm ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        } border-l shadow-2xl`}
      >
        <div className="h-full flex flex-col">
          <div
            className={`flex items-center justify-between p-4 border-b ${
              dm ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <h3
              className={`text-lg font-semibold ${
                dm ? "text-white" : "text-gray-900"
              }`}
            >
              History
            </h3>
            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
              )}
              <button
                onClick={() => setShowHistory(false)}
                className={`p-1 rounded ${
                  dm ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {history.length === 0 ? (
              <div className="text-center py-12">
                <Clock
                  className={`w-12 h-12 mx-auto mb-3 ${
                    dm ? "text-gray-600" : "text-gray-300"
                  }`}
                />
                <p className={dm ? "text-gray-500" : "text-gray-400"}>
                  No history yet
                </p>
                <p
                  className={`text-sm mt-1 ${
                    dm ? "text-gray-600" : "text-gray-400"
                  }`}
                >
                  Processed images will appear here
                </p>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg border overflow-hidden ${
                    dm
                      ? "border-gray-700 bg-gray-700/50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div
                    className="h-32 overflow-hidden"
                    style={{
                      backgroundImage: CHECKERBOARD,
                      backgroundSize: "10px 10px",
                    }}
                  >
                    <img
                      src={item.processedUrl}
                      alt="Processed"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="p-3">
                    <p
                      className={`text-sm font-medium truncate ${
                        dm ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {item.fileName || "URL Image"}
                    </p>
                    <p
                      className={`text-xs ${
                        dm ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={() => loadFromHistory(item)}
                        className="text-xs font-medium text-purple-600 hover:text-purple-700"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => removeFromHistory(item.id)}
                        className="text-xs font-medium text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer
        className={`${
          dm ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        } border-t`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center space-y-2">
            <p className={dm ? "text-gray-400" : "text-gray-600"}>
              Made with ❤️ by{" "}
              <span className="font-semibold text-purple-600">
                Sewak Gautam
              </span>{" "}
              • Powered by{" "}
              <a
                href="https://remove.bg"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Remove.bg API
              </a>{" "}
              • Open Source on{" "}
              <a
                href="https://github.com/sewakgautam/Erase-a-scene"
                target="_blank"
                rel="noopener noreferrer"
                className={`font-semibold ${
                  dm
                    ? "text-white hover:text-gray-300"
                    : "text-gray-900 hover:text-gray-700"
                } transition-colors`}
              >
                GitHub
              </a>
            </p>
            {processedCount > 0 && (
              <p
                className={`text-sm ${
                  dm ? "text-gray-500" : "text-gray-400"
                }`}
              >
                {processedCount} image{processedCount !== 1 ? "s" : ""}{" "}
                processed
              </p>
            )}
            <p
              className={`text-xs ${dm ? "text-gray-600" : "text-gray-400"}`}
            >
              {MOD_KEY}Z to reset • {MOD_KEY}V to paste images
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
