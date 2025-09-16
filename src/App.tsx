import { useState, useRef } from "react";
import { Upload, Download, Zap, Sparkles, Link, X } from "lucide-react";
import { ACCESSKEY } from "./config.ts";
interface ApiError extends Error {
  status?: number;
}

function App(): JSX.Element {
  const [imagelink, setImage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [requestLink, setRequestlink] = useState<string>("");
  const [finalImage, setFinalImage] = useState<string>("");
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [inputMethod, setInputMethod] = useState<"url" | "file">("url");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Your API key - replace with your actual key or import from config

  function bgremove(): void {
    if (inputMethod === "url" && imagelink === "") {
      setError("Please enter an image URL");
      return;
    }
    
    if (inputMethod === "file" && !uploadedFile) {
      setError("Please select an image file");
      return;
    }
    
    setLoading(true);
    setError("");
    
    if (inputMethod === "url") {
      setRequestlink(imagelink);
      removeBackgroundFromURL(imagelink);
    } else if (uploadedFile) {
      setRequestlink(URL.createObjectURL(uploadedFile));
      removeBackgroundFromFile(uploadedFile);
    }
  }

  async function removeBackgroundFromURL(imageUrl: string): Promise<void> {
    const formData = new FormData();
    formData.append("size", "auto");
    formData.append("image_url", imageUrl);

    try {
      const response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: {
          "X-Api-Key": ACCESSKEY,
        },
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setFinalImage(imageUrl);
        setImage("");
      } else {
        const errorText = await response.text();
        const apiError: ApiError = new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
        apiError.status = response.status;
        throw apiError;
      }
    } catch (err) {
      console.error("Error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to remove background. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function removeBackgroundFromFile(file: File): Promise<void> {
    const formData = new FormData();
    formData.append("size", "auto");
    formData.append("image_file", file);

    try {
      const response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: {
          "X-Api-Key": ACCESSKEY,
        },
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setFinalImage(imageUrl);
        setUploadedFile(null);
      } else {
        const errorText = await response.text();
        const apiError: ApiError = new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
        apiError.status = response.status;
        throw apiError;
      }
    } catch (err) {
      console.error("Error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to remove background. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragOver(false);
    setError("");
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setUploadedFile(file);
        setInputMethod("file");
        setImage("");
        setFinalImage("");
      } else {
        setError("Please drop an image file (JPG, PNG, WebP, etc.)");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setUploadedFile(file);
        setInputMethod("file");
        setImage("");
        setFinalImage("");
        setError("");
      } else {
        setError("Please select an image file (JPG, PNG, WebP, etc.)");
      }
    }
  };

  const downloadImage = (): void => {
    if (finalImage) {
      const link = document.createElement('a');
      link.href = finalImage;
      link.download = 'background-removed.png';
      link.click();
    }
  };

  const resetForm = (): void => {
    setImage("");
    setUploadedFile(null);
    setFinalImage("");
    setRequestlink("");
    setError("");
    setInputMethod("url");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const switchToURL = (): void => {
    setInputMethod("url");
    setUploadedFile(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const switchToFile = (): void => {
    setInputMethod("file");
    setImage("");
    setError("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      bgremove();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setImage(e.target.value);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (): void => {
    setDragOver(false);
  };

  const stopPropagation = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openFileDialog = (): void => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-white/20 sticky top-0 z-50">
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
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-600 hover:text-purple-600 font-medium transition-colors">Features</a>
              <a href="#" className="text-gray-600 hover:text-purple-600 font-medium transition-colors">API</a>
              <a href="#" className="text-gray-600 hover:text-purple-600 font-medium transition-colors">Pricing</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Remove Background
            <span className="block bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              in 5 seconds
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            100% automatically – in just one click. Upload your photo now and see the magic happen!
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8 border border-white/20">
          {/* Input Method Toggle */}
          <div className="flex justify-center mb-6">
            <div className="bg-gray-100 p-1 rounded-lg">
              <button
                onClick={switchToURL}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  inputMethod === "url"
                    ? "bg-white text-purple-600 shadow-sm"
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
                    ? "bg-white text-purple-600 shadow-sm"
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
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Enter Image URL
                </h3>
                <p className="text-gray-600 mb-6">
                  Paste a direct link to your image
                </p>
              </div>
              
              <div className="max-w-md mx-auto">
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="url"
                    value={imagelink}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="https://example.com/image.jpg"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* File Upload */
            <div 
              className={`border-2 border-dashed rounded-xl p-8 transition-all duration-300 cursor-pointer ${
                dragOver 
                  ? 'border-purple-400 bg-purple-50' 
                  : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/50'
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
                    <h3 className="text-xl font-semibold text-gray-900">
                      File Selected
                    </h3>
                    <p className="text-gray-600">{uploadedFile.name}</p>
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
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Upload an image
                    </h3>
                    <p className="text-gray-600 mb-4">
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

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <X className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <button
              onClick={bgremove}
              disabled={loading || (inputMethod === "url" && !imagelink) || (inputMethod === "file" && !uploadedFile)}
              className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
                loading || (inputMethod === "url" && !imagelink) || (inputMethod === "file" && !uploadedFile)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transform hover:scale-105 shadow-lg hover:shadow-xl'
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
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <X className="w-5 h-5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Loading Section */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-white/20 mb-8">
            <div className="text-center">
              <div className="relative mx-auto w-20 h-20 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-purple-200"></div>
                <div className="absolute inset-0 rounded-full border-4 border-purple-600 border-t-transparent animate-spin"></div>
                <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                AI is working its magic...
              </h3>
              <p className="text-gray-600">
                Removing background with pixel-perfect precision
              </p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {finalImage && !loading && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-white/20 mb-8">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                🎉 Background Removed Successfully!
              </h3>
              <p className="text-gray-600">
                Your image is ready. Compare the results below.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Original Image */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                  <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                  Original
                </h4>
                <div className="relative group">
                  <img 
                    src={requestLink} 
                    alt="Original" 
                    className="w-full h-80 object-cover rounded-xl shadow-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-xl"></div>
                </div>
              </div>

              {/* Processed Image */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  Background Removed
                </h4>
                <div className="relative group">
                  <div className="absolute inset-0 bg-transparent opacity-50 rounded-xl" style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3e%3cdefs%3e%3cpattern id='a' patternUnits='userSpaceOnUse' width='20' height='20'%3e%3crect x='0' y='0' width='10' height='10' fill='%23f3f4f6'/%3e%3crect x='10' y='10' width='10' height='10' fill='%23f3f4f6'/%3e%3c/pattern%3e%3c/defs%3e%3crect width='100%25' height='100%25' fill='url(%23a)'/%3e%3c/svg%3e")`,
                    backgroundSize: '20px 20px'
                  }}></div>
                  <img 
                    src={finalImage} 
                    alt="Background Removed" 
                    className="relative w-full h-80 object-cover rounded-xl shadow-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-xl"></div>
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-8">
              <button
                onClick={downloadImage}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transform hover:scale-105 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
              >
                <Download className="w-5 h-5" />
                <span>Download HD Result</span>
              </button>
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Why choose Erase-a-Scene?
          </h3>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">Lightning Fast</h4>
            <p className="text-gray-600">Process images in seconds with our advanced AI technology.</p>
          </div>
          
          <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">AI Precision</h4>
            <p className="text-gray-600">Pixel-perfect results with advanced machine learning algorithms.</p>
          </div>
          
          <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Download className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">HD Quality</h4>
            <p className="text-gray-600">Download high-resolution images without watermarks.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600">
              Made with ❤️ by{" "}
              <span className="font-semibold text-purple-600">Sewak Gautam</span>
              {" "}• Powered by{" "}
              <a 
                href="https://remove.bg" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Remove.bg API
              </a>
              {" "}• Open Source on{" "}
              <a 
                href="https://github.com/sewakgautam/Erase-a-scene"
                target="_blank"
                rel="noopener noreferrer" 
                className="font-semibold text-gray-900 hover:text-gray-700 transition-colors"
              >
                GitHub
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
