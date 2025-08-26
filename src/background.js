const browserAPI = (typeof browser !== 'undefined' ? browser : chrome);

const DEFAULT_PROMPTS = [
  { id: 'fix_grammar', title: 'Fix spelling and grammar', prompt: 'Fix the spelling and grammar. Return only the corrected text without quotes, explanations, or additional text:' },
  { id: 'improve_writing', title: 'Improve writing', prompt: 'Enhance the following text to improve clarity and flow. Return only the improved text without quotes, explanations, or additional text:' },
  { id: 'make_professional', title: 'Make more professional', prompt: 'Rewrite the text in a formal, professional tone. Return only the rewritten text without quotes, explanations, or additional text:' },
  { id: 'simplify', title: 'Simplify text', prompt: 'Simplify this text using simpler words and shorter sentences. Return only the simplified text without quotes, explanations, or additional text:' },
  { id: 'summarize', title: 'Summarize text', prompt: 'Provide a concise summary. Return only the summary without quotes, explanations, or additional text:' },
  { id: 'expand', title: 'Expand text', prompt: 'Elaborate on this text with more details and examples. Return only the expanded text without quotes, explanations, or additional text:' },
  { id: 'bullet_points', title: 'Convert to bullet points', prompt: 'Convert this text into bullet points. Return only the bullet-point list without quotes, explanations, or additional text:' },
];

if (typeof importScripts === 'function') {
  browserAPI.runtime.onInstalled.addListener(handleInstall);
} else {
  handleInstall({ reason: 'install' });
}

async function handleInstall(details) {
  if (details.reason === 'update') {
    log(`Extension updated from version ${details.previousVersion} to ${browserAPI.runtime.getManifest().version}`);
  }
  await updateContextMenu();
}

async function injectContentScript(tabId) {
  try {
    if (browserAPI === chrome) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
    } else {
      await browser.tabs.executeScript(tabId, {
        file: 'content.js'
      });
    }
  } catch (error) {
    console.error('Failed to inject content script:', error);
    throw error;
  }
}

browserAPI.contextMenus.onClicked.addListener((info, tab) => {
  browserAPI.storage.sync.get('customPrompts', async ({ customPrompts = [] }) => {
    const allPrompts = [...DEFAULT_PROMPTS, ...customPrompts];
    if (allPrompts.some(prompt => prompt.id === info.menuItemId)) {
      try {
        try {
          await browserAPI.tabs.sendMessage(tab.id, { action: 'ping' });
          await sendEnhanceTextMessage(tab.id, info.menuItemId, info.selectionText);
        } catch (error) {
          await injectContentScript(tab.id);
          await sendEnhanceTextMessage(tab.id, info.menuItemId, info.selectionText);
        }
      } catch (error) {
        console.error('Error handling context menu click:', error);
      }
    }
  });
});

async function sendEnhanceTextMessage(tabId, promptId, selectedText) {
  try {
    await browserAPI.tabs.sendMessage(tabId, {
      action: 'enhanceText',
      promptId: promptId,
      selectedText: selectedText,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'enhanceText') {
    enhanceTextWithRateLimit(request.promptId, request.selectedText)
      .then(enhancedText => {
        sendResponse({ success: true, enhancedText });
      })
      .catch(error => {
        log(`Error enhancing text: ${error.message}`, 'error');
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  return false;
});

async function enhanceTextWithLLM(promptId, text) {
  const config = await getConfig();
  const llmProvider = config.llmProvider;
  const customPrompts = config.customPrompts || [];
  if (!llmProvider) {
    throw new Error('LLM provider not set. Please set it in the extension options.');
  }
  
  const allPrompts = [...DEFAULT_PROMPTS, ...customPrompts];
  const prompt = allPrompts.find(p => p.id === promptId)?.prompt;
  if (!prompt) {
    throw new Error('Invalid prompt ID');
  }
  const fullPrompt = `${prompt}:\n\n${text}`;

  const enhanceFunctions = {
    openai: enhanceWithOpenAI,
    anthropic: enhanceWithAnthropic,
    ollama: enhanceWithOllama,
    lmstudio: enhanceWithLMStudio,
    groq: enhanceWithGroq,
    openrouter: enhanceWithOpenRouter,
    gemini: enhanceWithGemini,
  };

  const enhanceFunction = enhanceFunctions[llmProvider];
  if (!enhanceFunction) {
    throw new Error('Invalid LLM provider selected');
  }

  return await enhanceFunction(fullPrompt);
}

async function enhanceWithOpenAI(prompt) {
  const config = await getConfig();
  if (!config.apiKey) {
    throw new Error('OpenAI API key not set. Please set it in the extension options.');
  }

  const endpoint = config.customEndpoint || 'https://api.openai.com/v1/chat/completions';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${encodeURIComponent(config.apiKey)}`,
      },
      body: JSON.stringify({
        model: config.llmModel || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API request failed: ${errorData.error.message}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    throw new Error(`Failed to enhance text with OpenAI. Error: ${error.message}`);
  }
}

async function enhanceWithAnthropic(prompt) {
  const { apiKey, llmModel, customEndpoint } = await browserAPI.storage.sync.get(['apiKey', 'llmModel', 'customEndpoint']);

  if (!apiKey) {
    throw new Error('Anthropic API key not set. Please set it in the extension options.');
  }

  if (!llmModel) {
    throw new Error('LLM model not set for Anthropic. Please set it in the extension options.');
  }

  const endpoint = customEndpoint || 'https://api.anthropic.com/v1/complete';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        prompt: `Human: ${prompt}\n\nAssistant:`,
        model: llmModel,
        max_tokens_to_sample: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Anthropic API request failed: ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.completion.trim();
  } catch (error) {
    throw new Error(`Failed to enhance text with Anthropic. Error: ${error.message}`);
  }
}

async function enhanceWithOllama(prompt) {
  const { llmModel, customEndpoint, apiKey } = await browserAPI.storage.sync.get(['llmModel', 'customEndpoint', 'apiKey']);

  if (!llmModel) {
    throw new Error('LLM model not set for Ollama. Please set it in the extension options.');
  }

  const endpoint = customEndpoint || 'http://localhost:11434/api/generate';

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if API key is provided (for remote Ollama instances)
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: llmModel || 'llama2',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API request failed: ${response.status} ${response.statusText}. ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.response) {
      throw new Error('Invalid response from Ollama API: missing response field');
    }

    return data.response.trim();
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error(`Failed to connect to Ollama. Make sure Ollama is running on ${endpoint.split('/api')[0]}. Error: ${error.message}`);
    }
    throw new Error(`Failed to enhance text with Ollama. Error: ${error.message}`);
  }
}

// NEW: Add LM Studio support
async function enhanceWithLMStudio(prompt) {
  const { llmModel, customEndpoint, apiKey } = await browserAPI.storage.sync.get(['llmModel', 'customEndpoint', 'apiKey']);

  if (!llmModel) {
    throw new Error('LLM model not set for LM Studio. Please set it in the extension options.');
  }

  const endpoint = customEndpoint || 'http://localhost:1234/v1/chat/completions';

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if API key is provided
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: llmModel,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7,
        stream: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LM Studio API request failed: ${response.status} ${response.statusText}. ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from LM Studio API: missing choices or message');
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error(`Failed to connect to LM Studio. Make sure LM Studio server is running on ${endpoint.split('/v1')[0]}. Error: ${error.message}`);
    }
    throw new Error(`Failed to enhance text with LM Studio. Error: ${error.message}`);
  }
}

async function enhanceWithGroq(prompt) {
  const config = await getConfig();

  if (!config.apiKey) {
    throw new Error('Groq API key not set. Please set it in the extension options.');
  }

  if (!config.llmModel) {
    throw new Error('LLM model not set for Groq. Please set it in the extension options.');
  }

  const endpoint = config.customEndpoint || 'https://api.groq.com/v1/chat/completions';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${encodeURIComponent(config.apiKey)}`,
      },
      body: JSON.stringify({
        model: config.llmModel || 'llama3-8b-8192',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API request failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Groq API error:', error);
    throw new Error(`Failed to enhance text with Groq. Error: ${error.message}`);
  }
}

async function enhanceWithOpenRouter(prompt) {
  const config = await getConfig();
  if (!config.apiKey) {
    throw new Error('OpenRouter API key not set. Please set it in the extension options.');
  }

  const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${encodeURIComponent(config.apiKey)}`,
        'X-Title': 'Scramble Browser Extension',
      },
      body: JSON.stringify({
        model: config.llmModel || 'openai/gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenRouter API request failed: ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenRouter API error:', error);
    throw new Error(`Failed to enhance text with OpenRouter. Error: ${error.message}`);
  }
}

async function enhanceWithGemini(prompt) {
  const config = await getConfig();
  if (!config.apiKey) {
    throw new Error('Gemini API key not set. Please set it in the extension options.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.llmModel || 'gemini-2.5-flash'}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API request failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(`Failed to enhance text with Gemini. Error: ${error.message}`);
  }
}

const MAX_REQUESTS_PER_MINUTE = 10;
const RATE_LIMIT_RESET_INTERVAL = 60000;

const rateLimiter = (() => {
  let requestCount = 0;
  let lastResetTime = Date.now();
  const queue = [];

  const resetRateLimit = () => {
    const now = Date.now();
    if (now - lastResetTime > RATE_LIMIT_RESET_INTERVAL) {
      requestCount = 0;
      lastResetTime = now;
    }
  };

  const executeNext = () => {
    if (queue.length > 0) {
      resetRateLimit();
      if (requestCount < MAX_REQUESTS_PER_MINUTE) {
        const next = queue.shift();
        requestCount++;
        next.resolve(next.fn());
        if (queue.length > 0) {
          setTimeout(executeNext, RATE_LIMIT_RESET_INTERVAL / MAX_REQUESTS_PER_MINUTE);
        }
      } else {
        setTimeout(executeNext, RATE_LIMIT_RESET_INTERVAL - (Date.now() - lastResetTime));
      }
    }
  };

  return (fn) => {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      if (queue.length === 1) {
        executeNext();
      }
    });
  };
})();

const enhanceTextWithRateLimit = (promptId, text) => {
  return rateLimiter(() => enhanceTextWithLLM(promptId, text));
};

async function getConfig() {
  const defaults = {
    apiKey: '',
    llmProvider: 'gemini',
    llmModel: 'gemini-2.5-flash',
    customEndpoint: '',
    customPrompts: []
  };
  const config = await browserAPI.storage.sync.get(defaults);
  return {
    apiKey: config.apiKey,
    llmModel: config.llmModel,
    customEndpoint: config.customEndpoint,
    llmProvider: config.llmProvider,
    customPrompts: config.customPrompts
  };
}

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  console[level](`[${timestamp}] ${message}`);
}

async function updateContextMenu() {
  try {
    await browserAPI.contextMenus.removeAll();
    const config = await getConfig();
    const customPrompts = config.customPrompts || [];
    const allPrompts = [...DEFAULT_PROMPTS, ...customPrompts];

    await browserAPI.contextMenus.create({
      id: 'scramble',
      title: 'Scramble',
      contexts: ['selection'],
    });

    for (const prompt of allPrompts) {
      await browserAPI.contextMenus.create({
        id: prompt.id,
        parentId: 'scramble',
        title: prompt.title,
        contexts: ['selection'],
      });
    }
  } catch (error) {
    console.error('Error updating context menu:', error);
  }
}

browserAPI.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.customPrompts) {
    updateContextMenu();
  }
});
