// Handle API key from query parameters on app load
(function () {
  "use strict";

  /**
   * Extract API key from URL query parameters, store in localStorage, and clean URL
   */
  function handleApiKeyFromQuery() {
    try {
      // Get current URL and search parameters
      const url = new URL(window.location.href);
      const searchParams = url.searchParams;

      // Check if apiKey parameter exists
      if (searchParams.has("apiKey")) {
        const apiKey = searchParams.get("apiKey");

        // Validate API key (basic check for non-empty string)
        if (apiKey && apiKey.trim().length > 0) {
          // Store API key in localStorage
          localStorage.setItem("apiKey", apiKey.trim());
          console.log("API key stored successfully");

          // Remove apiKey parameter from URL
          searchParams.delete("apiKey");

          // Update URL without refreshing the page
          const newUrl =
            url.pathname +
            (searchParams.toString() ? "?" + searchParams.toString() : "") +
            url.hash;
          window.history.replaceState({}, document.title, newUrl);

          console.log("API key parameter removed from URL");
        } else {
          console.warn("API key parameter found but is empty or invalid");
        }
      }
    } catch (error) {
      console.error("Error handling API key from query parameters:", error);
    }
  }

  /**
   * Get stored API key from localStorage
   * @returns {string|null} The stored API key or null if not found
   */
  function getStoredApiKey() {
    try {
      return localStorage.getItem("apiKey");
    } catch (error) {
      console.error("Error retrieving API key from localStorage:", error);
      return null;
    }
  }

  /**
   * Remove stored API key from localStorage
   */
  function clearStoredApiKey() {
    try {
      localStorage.removeItem("apiKey");
      console.log("API key cleared from localStorage");
    } catch (error) {
      console.error("Error clearing API key from localStorage:", error);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", handleApiKeyFromQuery);
  } else {
    // DOM is already ready
    handleApiKeyFromQuery();
  }

  // Export functions to global scope for potential use by other scripts
  window.ImageTo3D = {
    getStoredApiKey,
    clearStoredApiKey,
    handleApiKeyFromQuery,
  };
})();

// Image preview functionality
(function () {
  "use strict";

  /**
   * Show image preview from file
   * @param {File} imageFile - The file to preview
   */
  function showImagePreview(imageFile) {
    const previewImg = document.getElementById("preview");
    const fileDropHint = document.getElementById("fileDropHint");

    if (!previewImg) {
      console.error("Preview image element not found");
      return;
    }

    // Clear previous preview
    previewImg.style.display = "none";
    previewImg.src = "";
    previewImg.onerror = null;
    previewImg.onload = null;

    // Show hint if no file
    if (fileDropHint) {
      fileDropHint.style.display = "block";
    }

    // Validate file
    if (!imageFile || !(imageFile instanceof File)) {
      return;
    }

    // Check if file is an image
    if (!imageFile.type.startsWith('image/')) {
      console.warn("Selected file is not an image:", imageFile.type);
      return;
    }

    // Create FileReader to read the file
    const reader = new FileReader();

    reader.onerror = function () {
      console.error("Failed to read image file:", imageFile.name);
      previewImg.style.display = "none";
      previewImg.alt = "Failed to load image";
      if (fileDropHint) {
        fileDropHint.style.display = "block";
      }
    };

    reader.onload = function (e) {
      console.log("Image file loaded successfully:", imageFile.name);
      previewImg.src = e.target.result;
      previewImg.style.display = "block";
      previewImg.alt = "Image preview";
      // Hide hint when image is loaded
      if (fileDropHint) {
        fileDropHint.style.display = "none";
      }
    };
    
    // Read the file as data URL
    reader.readAsDataURL(imageFile);
  }

  /**
   * Initialize image preview functionality
   */
  function initializeImagePreview() {
    const imageInput = document.getElementById("imageInput");
    const previewImg = document.getElementById("preview");
    const fileDropHint = document.getElementById("fileDropHint");

    if (!imageInput) {
      console.error("Image input element not found");
      return;
    }

    // Clear preview on page load/refresh and show hint
    if (previewImg) {
      previewImg.style.display = "none";
      previewImg.src = "";
      previewImg.alt = "Image preview";
    }
    if (fileDropHint) {
      fileDropHint.style.display = "block";
    }

    // Handle file input changes
    imageInput.addEventListener("change", function (event) {
      const file = event.target.files[0];
      if (file) {
        showImagePreview(file);
      } else {
        // Clear preview if no file selected and show hint
        if (previewImg) {
          previewImg.style.display = "none";
          previewImg.src = "";
          previewImg.alt = "Image preview";
        }
        if (fileDropHint) {
          fileDropHint.style.display = "block";
        }
      }
    });

    // Handle drag and drop
    const container = imageInput.parentElement;
    if (container) {
      container.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        container.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
        container.style.borderColor = 'var(--secondary)';
      });

      container.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        container.style.backgroundColor = '';
        container.style.borderColor = '';
      });

      container.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        container.style.backgroundColor = '';
        container.style.borderColor = '';
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
          imageInput.files = files;
          showImagePreview(files[0]);
        }
      });
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeImagePreview);
  } else {
    initializeImagePreview();
  }

  // Add to global namespace
  if (window.ImageTo3D) {
    window.ImageTo3D.showImagePreview = showImagePreview;
    window.ImageTo3D.initializeImagePreview = initializeImagePreview;
  } else {
    window.ImageTo3D = {
      showImagePreview,
      initializeImagePreview,
    };
  }
})();

// 3D Model Generation functionality
(function () {
  "use strict";

  const SYNEXA_API_BASE = "https://api.synexa.ai";
  const HUNYUAN3D_MODEL = "tencent/hunyuan3d-2";

  /**
   * Upload image file to the upload endpoint
   * @param {File} file - The file to upload
   * @returns {Promise<string>} The uploaded file URL
   */
  async function uploadImageFile(file) {
    if (!file || !(file instanceof File)) {
      throw new Error('Invalid file provided');
    }

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('file-data', file);

    const response = await fetch('https://voxbox-pl.nonprod.voxteam.pl/api/tools/files/image-to-3d', {
      method: 'POST',
      body: formData,
      // Note: Don't set Content-Type header manually for FormData, let the browser set it
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Failed to upload image: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const result = await response.json();
    
    if (!result.url) {
      throw new Error('Upload response did not contain a URL');
    }

    return result.url;
  }

  /**
   * Generate 3D model using Hunyuan3D-2 API
   * @param {Object} params - Generation parameters
   * @returns {Promise<Object>} API response
   */
  async function generate3DModel(params) {
    const apiKey = window.ImageTo3D.getStoredApiKey();

    if (!apiKey) {
      throw new Error(
        "API key not found. Please add your Synexa API key to the URL: ?apiKey=your-key"
      );
    }

    // Validate required parameters
    if (!params.imageUrl) {
      throw new Error("Image URL is required");
    }

    // Prepare the request payload
    const payload = {
      model: HUNYUAN3D_MODEL,
      input: {
        image: params.imageUrl,
        shape_only: !params.generateTextures,
        check_box_rembg: params.removeBackground !== false,
        caption: "",
        steps: 5,
        octree_resolution: "256",
        guidance_scale: 5.5,
      },
    };

    const response = await fetch(
      `${SYNEXA_API_BASE}/v1/predictions`,
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          `API request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Poll for prediction result
   * @param {string} predictionId - The prediction ID to poll
   * @returns {Promise<Object>} Final result
   */
  async function pollPredictionResult(predictionId) {
    const apiKey = window.ImageTo3D.getStoredApiKey();

    const maxAttempts = 120; // 10 minutes max (5s intervals)
    let attempts = 0;

    while (attempts < maxAttempts) {
      const response = await fetch(
        `${SYNEXA_API_BASE}/v1/predictions/${predictionId}`,
        {
          headers: {
            "x-api-key": apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get prediction status: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === "succeeded") {
        return result;
      } else if (result.status === "failed") {
        throw new Error(result.error || "Model generation failed");
      }

      // Update status
      updateStatus(
        `Generating... (${Math.round((attempts / maxAttempts) * 100)}%)`,
        "loading"
      );

      // Wait 5 seconds before next poll
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    }

    throw new Error("Generation timeout - please try again");
  }

  /**
   * Update status message
   * @param {string} message - Status message
   * @param {string} type - Message type (loading, success, error)
   */
  function updateStatus(message, type = "loading") {
    const statusEl = document.getElementById("status");
    const modelStatusEl = document.getElementById("modelStatus");

    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `status-message ${type}`;
      statusEl.style.display = "block";
    }

    if (modelStatusEl) {
      modelStatusEl.textContent = message;
    }
  }

  /**
   * Update model viewer with new 3D model
   * @param {string} modelUrl - URL to the GLB file
   */
  function updateModelViewer(modelUrl) {
    const modelViewer = document.getElementById("modelViewer");
    const modelPlaceholder = document.getElementById("modelPlaceholder");
    const downloadBtn = document.getElementById("downloadBtn");
    const downloadSection = document.getElementById("downloadSection");

    if (modelViewer && modelPlaceholder) {
      // Hide placeholder and show model viewer
      modelPlaceholder.style.display = "none";
      modelViewer.style.display = "block";
      modelViewer.src = modelUrl;
      modelViewer.alt = "Generated 3D Model";
    }

    if (downloadBtn && downloadSection) {
      downloadBtn.onclick = () => {
        const link = document.createElement("a");
        link.href = modelUrl;
        link.download = `generated-model-${Date.now()}.glb`;
        link.click();
      };
      downloadSection.style.display = "flex";
    }
  }

  /**
   * Handle 3D model generation
   */
  async function handleGeneration() {
    const generateBtn = document.getElementById("generateBtn");
    const imageInput = document.getElementById("imageInput");
    const generateTextureCheckbox = document.getElementById("generateTextures");
    const removeBackgroundCheckbox =
      document.getElementById("removeBackground");

    // Validate inputs
    const selectedFile = imageInput?.files?.[0];
    if (!selectedFile) {
      updateStatus("Please select an image file", "error");
      return;
    }

    // Check if file is an image
    if (!selectedFile.type.startsWith('image/')) {
      updateStatus("Please select a valid image file", "error");
      return;
    }

    // Disable button and show loading state
    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.textContent = "Generating...";
    }

    try {
      updateStatus("Uploading image...", "loading");

      // Upload file and get URL
      const imageUrl = await uploadImageFile(selectedFile);
      
      updateStatus("Starting 3D generation...", "loading");

      // Prepare parameters
      const params = {
        imageUrl: imageUrl,
        generateTextures: generateTextureCheckbox?.checked || false,
        removeBackground: removeBackgroundCheckbox?.checked !== false,
      };

      // Start generation
      const prediction = await generate3DModel(params);
      updateStatus("Generation started, waiting for result...", "loading");

      // Poll for result
      const result = await pollPredictionResult(prediction.id);

      // Handle success
      if (result.output && result.output.length > 0) {
        const modelUrl =  result.output.pop();
        updateModelViewer(modelUrl);
        updateStatus("3D model generated successfully!", "success");
      } else {
        throw new Error("No model output received");
      }
    } catch (error) {
      console.error("Generation error:", error);
      updateStatus(`Error: ${error.message}`, "error");
    } finally {
      // Re-enable button
      if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.textContent = "Generate 3D Model";
      }
    }
  }

  /**
   * Initialize 3D generation functionality
   */
  function initialize3DGeneration() {
    const generateBtn = document.getElementById("generateBtn");

    if (generateBtn) {
      generateBtn.addEventListener("click", handleGeneration);
    }

    // Check for API key on load
    const apiKey = window.ImageTo3D?.getStoredApiKey();
    if (!apiKey) {
      updateStatus(
        "API key required. Add ?apiKey=your-key to the URL",
        "error"
      );
    } else {
      updateStatus("Ready to generate your 3D model", "success");
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize3DGeneration);
  } else {
    initialize3DGeneration();
  }

  // Add to global namespace
  if (window.ImageTo3D) {
    window.ImageTo3D.generate3DModel = generate3DModel;
    window.ImageTo3D.handleGeneration = handleGeneration;
    window.ImageTo3D.uploadImageFile = uploadImageFile;
  } else {
    window.ImageTo3D = {
      generate3DModel,
      handleGeneration,
      uploadImageFile,
    };
  }
})();
