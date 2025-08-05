// Handle API key from query parameters on app load
(function() {
    'use strict';
    
    /**
     * Extract API key from URL query parameters, store in localStorage, and clean URL
     */
    function handleApiKeyFromQuery() {
        try {
            // Get current URL and search parameters
            const url = new URL(window.location.href);
            const searchParams = url.searchParams;
            
            // Check if apiKey parameter exists
            if (searchParams.has('apiKey')) {
                const apiKey = searchParams.get('apiKey');
                
                // Validate API key (basic check for non-empty string)
                if (apiKey && apiKey.trim().length > 0) {
                    // Store API key in localStorage
                    localStorage.setItem('apiKey', apiKey.trim());
                    console.log('API key stored successfully');
                    
                    // Remove apiKey parameter from URL
                    searchParams.delete('apiKey');
                    
                    // Update URL without refreshing the page
                    const newUrl = url.pathname + (searchParams.toString() ? '?' + searchParams.toString() : '') + url.hash;
                    window.history.replaceState({}, document.title, newUrl);
                    
                    console.log('API key parameter removed from URL');
                } else {
                    console.warn('API key parameter found but is empty or invalid');
                }
            }
        } catch (error) {
            console.error('Error handling API key from query parameters:', error);
        }
    }
    
    /**
     * Get stored API key from localStorage
     * @returns {string|null} The stored API key or null if not found
     */
    function getStoredApiKey() {
        try {
            return localStorage.getItem('apiKey');
        } catch (error) {
            console.error('Error retrieving API key from localStorage:', error);
            return null;
        }
    }
    
    /**
     * Remove stored API key from localStorage
     */
    function clearStoredApiKey() {
        try {
            localStorage.removeItem('apiKey');
            console.log('API key cleared from localStorage');
        } catch (error) {
            console.error('Error clearing API key from localStorage:', error);
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handleApiKeyFromQuery);
    } else {
        // DOM is already ready
        handleApiKeyFromQuery();
    }
    
    // Export functions to global scope for potential use by other scripts
    window.ImageTo3D = {
        getStoredApiKey,
        clearStoredApiKey,
        handleApiKeyFromQuery
    };
    
})();