const browserAPI = (typeof browser !== 'undefined' ? browser : chrome);

document.addEventListener('DOMContentLoaded', async function() {
    const statusElement = document.getElementById('status');
    const optionsButton = document.getElementById('optionsButton');
    const inlineToggle = document.getElementById('inlineToggle');
  
    try {
        // Use async/await and proper error handling
        const result = await new Promise((resolve) => {
            browserAPI.storage.sync.get({
                llmProvider: 'gemini', // default value
                apiKey: '',
                inlineCheckerEnabled: true
            }, resolve);
        });

        // Update inline checker toggle state
        if (result.inlineCheckerEnabled) {
            inlineToggle.classList.add('active');
        }

        if (result.apiKey) {
            statusElement.textContent = `Extension is ready to use with ${result.llmProvider} provider.`;
            statusElement.style.color = '#4CAF50'; // Success color
        } else {
            statusElement.textContent = 'API key not set. Please set it in the options.';
            statusElement.style.color = '#f44336'; // Error color
        }
    } catch (error) {
        console.error('Error checking storage:', error);
        statusElement.textContent = 'Error checking extension status.';
        statusElement.style.color = '#f44336';
    }

    // Handle inline checker toggle
    inlineToggle.addEventListener('click', async function() {
        try {
            const isCurrentlyActive = inlineToggle.classList.contains('active');
            const newState = !isCurrentlyActive;
            
            // Update storage
            await new Promise((resolve, reject) => {
                browserAPI.storage.sync.set({ inlineCheckerEnabled: newState }, () => {
                    if (browserAPI.runtime.lastError) {
                        reject(browserAPI.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            });

            // Update UI
            if (newState) {
                inlineToggle.classList.add('active');
            } else {
                inlineToggle.classList.remove('active');
            }

            // Notify content scripts of the change
            try {
                const tabs = await new Promise((resolve) => {
                    browserAPI.tabs.query({ active: true, currentWindow: true }, resolve);
                });
                
                if (tabs[0]) {
                    browserAPI.tabs.sendMessage(tabs[0].id, {
                        action: 'toggleInlineChecker',
                        enabled: newState
                    }).catch(() => {
                        // Ignore errors if content script is not loaded
                    });
                }
            } catch (error) {
                console.log('Could not notify content script:', error);
            }

        } catch (error) {
            console.error('Error toggling inline checker:', error);
        }
    });

    // Open options page when button is clicked
    optionsButton.addEventListener('click', function() {
        try {
            if (browserAPI.runtime.openOptionsPage) {
                // Chrome & Firefox support
                browserAPI.runtime.openOptionsPage();
            } else {
                // Fallback for older Firefox versions
                window.open(browserAPI.runtime.getURL('options.html'));
            }
        } catch (error) {
            console.error('Error opening options page:', error);
            // Fallback method
            window.open(browserAPI.runtime.getURL('options.html'));
        }
    });
});