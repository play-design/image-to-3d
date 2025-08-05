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
   * Show image preview from URL
   * @param {string} imageUrl - The URL of the image to preview
   */
  function showImagePreview(imageUrl) {
    const previewImg = document.getElementById("preview");

    if (!previewImg) {
      console.error("Preview image element not found");
      return;
    }

    // Clear previous preview
    previewImg.style.display = "none";
    previewImg.src = "";
    previewImg.onerror = null;
    previewImg.onload = null;

    // Validate URL
    if (!imageUrl || imageUrl.trim().length === 0) {
      return;
    }

    const trimmedUrl = imageUrl.trim();

    // Basic URL validation
    try {
      new URL(trimmedUrl);
    } catch (error) {
      console.warn("Invalid URL provided:", trimmedUrl);
      return;
    }

    // Set up error handling
    previewImg.onerror = function () {
      console.error("Failed to load image:", trimmedUrl);
      previewImg.style.display = "none";
      previewImg.alt = "Failed to load image";
    };

    // Set up success handling
    previewImg.onload = function () {
      console.log("Image loaded successfully:", trimmedUrl);
      previewImg.style.display = "block";
      previewImg.alt = "Image preview";
    };

    // Set the image source
    previewImg.src = trimmedUrl;
  }

  /**
   * Initialize image preview functionality
   */
  function initializeImagePreview() {
    const imageInput = document.getElementById("imageInput");

    if (!imageInput) {
      console.error("Image input element not found");
      return;
    }

    // Handle input changes with debouncing
    let debounceTimer;

    imageInput.addEventListener("input", function (event) {
      clearTimeout(debounceTimer);

      debounceTimer = setTimeout(() => {
        const imageUrl = event.target.value;
        showImagePreview(imageUrl);
      }, 500); // 500ms debounce
    });

    // Handle paste events
    imageInput.addEventListener("paste", function (event) {
      setTimeout(() => {
        const imageUrl = event.target.value;
        showImagePreview(imageUrl);
      }, 100);
    });

    // Handle Enter key
    imageInput.addEventListener("keypress", function (event) {
      if (event.key === "Enter") {
        clearTimeout(debounceTimer);
        const imageUrl = event.target.value;
        showImagePreview(imageUrl);
      }
    });
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
   * Generate 3D model using Hunyuan3D-2 API
   * @param {Object} params - Generation parameters
   * @returns {Promise<Object>} API response
   */
  async function generate3DModel(params) {
    const apiKey = window.ImageTo3D.getStoredApiKey();
    
    if (!apiKey) {
      throw new Error("API key not found. Please add your Synexa API key to the URL: ?apiKey=your-key");
    }

    // Validate required parameters
    if (!params.imageUrl) {
      throw new Error("Image URL is required");
    }

    // Prepare the request payload
    const payload = {
      input: {
        image: params.imageUrl,
        shape_only: !params.generateTextures,
        check_box_rembg: params.removeBackground !== false,
        steps: 5,
        octree_resolution: "256",
        guidance_scale: 5.5,
      }
    };

    const response = await fetch(`${SYNEXA_API_BASE}/v1/models/${HUNYUAN3D_MODEL}/predictions`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API request failed: ${response.status} ${response.statusText}`);
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
      const response = await fetch(`${SYNEXA_API_BASE}/v1/predictions/${predictionId}`, {
        headers: {
          "x-api-key": apiKey,
        }
      });

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
      updateStatus(`Generating... (${Math.round((attempts / maxAttempts) * 100)}%)`, "loading");
      
      // Wait 5 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));
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
    const downloadBtn = document.getElementById("downloadBtn");
    const downloadSection = document.getElementById("downloadSection");
    
    if (modelViewer) {
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
    const removeBackgroundCheckbox = document.getElementById("removeBackground");

    // Validate inputs
    const imageUrl = imageInput?.value?.trim();
    if (!imageUrl) {
      updateStatus("Please enter an image URL", "error");
      return;
    }

    // Disable button and show loading state
    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.textContent = "Generating...";
    }

    try {
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
        const modelUrl = result.output[0];
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
      updateStatus("API key required. Add ?apiKey=your-key to the URL", "error");
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
  } else {
    window.ImageTo3D = {
      generate3DModel,
      handleGeneration,
    };
  }
})();
