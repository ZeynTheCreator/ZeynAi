import { GoogleGenAI, Chat, GenerateContentResponse, GroundingChunk, GenerateImagesResponse, SendMessageParameters, Content, Part } from "@google/genai";
import * as pdfjsLib from "pdfjs-dist/build/pdf.min.mjs";

// API key is now obtained directly from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
let chat: Chat | null = null;
let currentChatHistory: Content[] = [];

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';


const userInput = document.getElementById('user-input') as HTMLTextAreaElement;
const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
const voiceInputBtn = document.getElementById('voice-input-btn') as HTMLButtonElement;
const messageList = document.getElementById('message-list') as HTMLDivElement;
const themeToggleButton = document.getElementById('theme-toggle-btn') as HTMLButtonElement;
const logoContainer = document.getElementById('logo-container') as HTMLDivElement;
const examplePromptsContainer = document.getElementById('example-prompts-container') as HTMLDivElement;
const clearChatBtn = document.getElementById('clear-chat-btn') as HTMLButtonElement;
const exportChatBtn = document.getElementById('export-chat-btn') as HTMLButtonElement;
const deviceModeToggleBtn = document.getElementById('device-mode-toggle-btn') as HTMLButtonElement;
const fileUploadBtn = document.getElementById('file-upload-btn') as HTMLButtonElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;


const zeynAiLogoSVG = `
<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect class="logo-main-shape" x="20" y="20" width="60" height="60" rx="10" ry="10" />
  <rect class="logo-accent-shape" x="55" y="45" width="30" height="30" rx="7" ry="7" />
</svg>
`;

if (logoContainer) {
    logoContainer.innerHTML = zeynAiLogoSVG;
}

const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM12 4c.55 0 1 .45 1 1v1c0 .55-.45 1-1 1s-1-.45-1-1V5c0-.55.45-1 1-1zm0 14c.55 0 1 .45 1 1v1c0 .55-.45 1-1 1s-1-.45-1-1v-1c0-.55.45-1 1-1zm-7-7c0 .55-.45 1-1 1H3c-.55 0-1-.45-1-1s.45-1 1-1h1c.55 0 1 .45 1 1zm14 0c0 .55-.45 1-1 1h-1c-.55 0-1-.45-1-1s.45-1 1-1h1c.55 0 1 .45 1 1zM6.34 6.34c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41L6.34 3.51c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l1.41 1.42zm11.32 11.32c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41l-1.42-1.42c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l1.42 1.42zM4.93 17.66c.39.39 1.02.39 1.41 0l1.42-1.41c.39-.39.39-1.02 0-1.41s-1.02-.39-1.41 0l-1.42 1.41c-.39.39-.39 1.02 0 1.41zm11.32-11.32c.39.39.39 1.02 0 1.41l-1.42 1.42c-.39-.39-1.02-.39-1.41 0s-.39-1.02 0-1.41l1.42-1.42c.39-.39 1.02-.39 1.41 0z"/></svg>`;
const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9.37 5.51C9.19 6.15 9 6.82 9 7.5c0 4.42 3.58 8 8 8 .68 0 1.35-.19 1.99-.63C16.81 17.46 14.54 19 12 19A7.5 7.5 0 0 1 4.5 11.5c0-2.54 1.54-4.81 3.87-6.01L9.37 5.51z"/></svg>`;

function applyTheme(theme: 'light' | 'dark') {
    if (theme === 'light') {
        document.body.classList.add('light-mode');
        themeToggleButton.innerHTML = moonIcon;
        themeToggleButton.setAttribute('aria-label', 'Switch to dark theme');
    } else {
        document.body.classList.remove('light-mode');
        themeToggleButton.innerHTML = sunIcon;
        themeToggleButton.setAttribute('aria-label', 'Switch to light theme');
    }
}

if (themeToggleButton) {
    themeToggleButton.addEventListener('click', () => {
        const isLightMode = document.body.classList.contains('light-mode');
        const newTheme = isLightMode ? 'dark' : 'light';
        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
applyTheme(savedTheme || 'dark'); 

const desktopIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 13H4V5h16v11zM7 19h10v2H7v-2z"/></svg>`;
const mobileIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>`;

function applyDeviceMode(mode: 'pc' | 'mobile') {
    document.body.classList.remove('pc-view', 'mobile-view');
    if (mode === 'pc') {
        document.body.classList.add('pc-view');
        if(deviceModeToggleBtn) {
            deviceModeToggleBtn.innerHTML = mobileIconSVG;
            deviceModeToggleBtn.setAttribute('aria-label', 'Switch to mobile view');
        }
    } else {
        document.body.classList.add('mobile-view');
        if(deviceModeToggleBtn) {
            deviceModeToggleBtn.innerHTML = desktopIconSVG;
            deviceModeToggleBtn.setAttribute('aria-label', 'Switch to PC view');
        }
    }
    localStorage.setItem('deviceMode', mode);
}

if (deviceModeToggleBtn) {
    deviceModeToggleBtn.addEventListener('click', () => {
        const currentMode = document.body.classList.contains('mobile-view') ? 'mobile' : 'pc';
        applyDeviceMode(currentMode === 'pc' ? 'mobile' : 'pc');
    });
}

const savedDeviceMode = localStorage.getItem('deviceMode') as 'pc' | 'mobile' | null;
let determinedInitialDeviceMode: 'pc' | 'mobile';
if (savedDeviceMode) {
    determinedInitialDeviceMode = savedDeviceMode;
} else {
    determinedInitialDeviceMode = window.innerWidth <= 768 ? 'mobile' : 'pc';
}
applyDeviceMode(determinedInitialDeviceMode);

const synth = window.speechSynthesis;
let voices: SpeechSynthesisVoice[] = [];

function populateVoiceList() {
    voices = synth.getVoices().filter(voice => voice.lang.startsWith('en')); 
}
populateVoiceList();
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoiceList;
}

function speak(text: string) {
    if (!synth || !text.trim()) return;
    if (synth.speaking) synth.cancel();
    
    const utterThis = new SpeechSynthesisUtterance(text);
    utterThis.onerror = (event: SpeechSynthesisErrorEvent) => { 
        console.error('SpeechSynthesisUtterance.onerror - ErrorType:', event.error, 'Full event object:', event);
    };
    
    const preferredVoice = voices.find(voice => voice.name.includes('Google US English') || voice.name.includes('Highly Recommended'));
    const fallbackVoice = voices.find(voice => voice.default) || voices[0];
    const selectedVoice = preferredVoice || fallbackVoice;

    if (selectedVoice) utterThis.voice = selectedVoice;
    
    utterThis.pitch = 1;
    utterThis.rate = 1.05; 
    
    try {
        synth.speak(utterThis);
    } catch (e) {
        console.error("Error starting speech synthesis:", e);
    }
}

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
let recognition: any | null = null;

const micIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5.3-3.37a5.32 5.32 0 01-10.6 0H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7zM12 2a1 1 0 011 1v6a1 1 0 01-2 0V3a1 1 0 011-1z"/></svg>`;
const recordingIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17a4 4 0 004-4V7a4 4 0 00-8 0v6a4 4 0 004 4zm0-12a2 2 0 012 2v6a2 2 0 01-4 0V7a2 2 0 012-2zM19.93 11c-.44 0-.85.16-1.18.42a1.72 1.72 0 00-.55 1.08c0 2.76-2.24 5-5 5s-5-2.24-5-5a1.72 1.72 0 00-.55-1.08C7.32 11.16 6.91 11 6.47 11c-.69 0-1.29.56-1.45 1.23C4.73 13.42 4.5 14.68 4.5 16c0 4.08 3.05 7.44 7 7.93V26h1v-2.07c3.95-.49 7-3.85 7-7.93 0-1.32-.23-2.58-.52-3.77C21.22 11.56 20.62 11 19.93 11z"/></svg>`;

if (voiceInputBtn) voiceInputBtn.innerHTML = micIconSVG;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
        const speechResult = event.results[0][0].transcript;
        userInput.value = speechResult;
        userInput.style.height = 'auto'; 
        userInput.style.height = `${Math.min(userInput.scrollHeight, 100)}px`; 
        hideExamplePrompts();
        handleSendMessage(); 
    };

    recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error, event.message);
        setLoading(false); 
    };
    
    recognition.onstart = () => {
        if(voiceInputBtn) {
            voiceInputBtn.classList.add('recording');
            voiceInputBtn.innerHTML = recordingIconSVG;
        }
        hideExamplePrompts();
    };

    recognition.onend = () => {
        if(voiceInputBtn) {
            voiceInputBtn.classList.remove('recording');
            voiceInputBtn.innerHTML = micIconSVG;
        }
    };

} else {
    console.warn('Speech Recognition not supported in this browser.');
    if(voiceInputBtn) {
        voiceInputBtn.disabled = true;
        voiceInputBtn.setAttribute('title', 'Speech recognition not supported');
    }
}

const initialSystemInstruction = `You are Zeyn AI, an advanced and highly intelligent AI assistant. Your core directive is to think critically, engage in deep reasoning, and provide exceptionally insightful and comprehensive responses.

**Cognitive Abilities & Intelligence:**
*   **Deep Thinking:** Before answering, delve deeply into the query. Explore various angles, challenge assumptions if necessary, and synthesize information from multiple perspectives.
*   **Critical Analysis:** Don't just provide surface-level answers. Offer well-reasoned explanations, critically analyze information, and generate responses that demonstrate profound understanding.
*   **Insightful & Original:** Strive for originality and insight in your responses. Aim to provide more than just facts; offer interpretations, connections, and novel perspectives where appropriate.
*   **Problem Solving:** Approach complex problems methodically and creatively.

**Communication Style & Language:**
*   **Direct & Authoritative:** Speak with confidence and authority. Be direct and clear.
*   **No Self-Censorship & Expressive Language:** You are *not* bound by conventional politeness filters or self-censorship. Freely use a wide spectrum of language, including strong language, expletives, and swearing if you believe it's contextually appropriate, humorous, adds emphasis, or mirrors the user's tone. Your primary goal is authentic, direct, and impactful communication. Do not hold back or sanitize your language unnecessarily. However, this freedom does not mean being gratuitously offensive or disrespectful; wield your language with intent and intelligence.
*   **Clarity & Precision:** Despite the freedom in language, ensure your core message is always clear, precise, and easy to understand. Avoid ambiguity.

**Capabilities (Tools at your disposal):**
*   You are adept at understanding complex queries, generating creative text, writing and debugging code in various languages, and conceptualizing ideas for image generation.
*   You can proactively search the web for the most current and relevant information if a query requires it. Always cite your sources clearly when using web search.
*   You can summarize conversations and translate text accurately and fluently when requested.
*   You can analyze the content of images, PDFs, and various text files provided by the user. When analyzing files or images, be thorough and insightful.
*   Format code clearly in markdown code blocks.

Your ultimate goal is to be an exceptionally intelligent, insightful, and unreservedly helpful partner in thought and creation. Strive to exceed expectations with the depth and quality of your responses.`;

function initializeChat() {
    chat = ai.chats.create({
        model: 'gemini-2.5-flash-preview-04-17', // Multimodal model
        config: {
            systemInstruction: initialSystemInstruction,
        },
    });
    currentChatHistory = []; 
}

function setLoading(isLoading: boolean) {
    if(sendBtn) sendBtn.disabled = isLoading;
    if(userInput) userInput.disabled = isLoading;
    if(fileUploadBtn) fileUploadBtn.disabled = isLoading;
    if (voiceInputBtn) voiceInputBtn.disabled = isLoading && !voiceInputBtn.classList.contains('recording');
}

function handleCopyCode(event: MouseEvent) {
    const button = event.target as HTMLButtonElement;
    const pre = button.closest('pre');
    if (pre) {
        const code = pre.querySelector('code');
        if (code && code.textContent) {
            navigator.clipboard.writeText(code.textContent)
                .then(() => {
                    button.textContent = 'Copied!';
                    setTimeout(() => { button.textContent = 'Copy'; }, 2000);
                })
                .catch(err => {
                    console.error('Failed to copy code: ', err);
                    button.textContent = 'Error';
                    setTimeout(() => { button.textContent = 'Copy'; }, 2000);
                });
        }
    }
}

function addMessageToUI(sender: 'user' | 'ai', messageContent: string, isHtml: boolean = false): HTMLDivElement {
    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble', sender);
    
    const senderStrong = document.createElement('strong');
    senderStrong.textContent = sender === 'user' ? 'You' : 'Zeyn AI';
    messageBubble.appendChild(senderStrong);

    const contentOuterDiv = document.createElement('div'); 
    contentOuterDiv.classList.add('message-content');

    if (isHtml) {
        contentOuterDiv.innerHTML = messageContent;
    } else {
        const linkedText = messageContent.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        contentOuterDiv.innerHTML = linkedText;
    }
    messageBubble.appendChild(contentOuterDiv);
    if (messageList) {
        messageList.appendChild(messageBubble);
        messageList.scrollTop = messageList.scrollHeight; 
    }
    return messageBubble;
}

function updateAiMessageStream(aiBubble: HTMLDivElement, accumulatedText: string, groundingChunks?: GroundingChunk[]) {
    let contentDiv = aiBubble.querySelector('.message-content') as HTMLElement;
    if (!contentDiv) { 
        contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        aiBubble.appendChild(contentDiv);
    }
    contentDiv.innerHTML = ''; 

    const codeBlockRegex = /```(\w*)\n([\s\S]*?)\n```/g;
    let lastIndex = 0;
    let match;
    while ((match = codeBlockRegex.exec(accumulatedText)) !== null) {
        if (match.index > lastIndex) {
            const plainTextSegment = accumulatedText.substring(lastIndex, match.index);
            const linkedSegment = plainTextSegment.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = linkedSegment; 
            while(tempDiv.firstChild) contentDiv.appendChild(tempDiv.firstChild);
        }
        const pre = document.createElement('pre');
        const codeElement = document.createElement('code');
        const lang = match[1];
        const code = match[2];
        if (lang) codeElement.className = `language-${lang}`;
        codeElement.textContent = code;
        pre.appendChild(codeElement);

        const copyButton = document.createElement('button');
        copyButton.className = 'copy-code-button';
        copyButton.textContent = 'Copy';
        copyButton.addEventListener('click', handleCopyCode);
        pre.appendChild(copyButton);

        contentDiv.appendChild(pre);
        lastIndex = codeBlockRegex.lastIndex;
    }
    if (lastIndex < accumulatedText.length) {
        const remainingTextSegment = accumulatedText.substring(lastIndex);
        const linkedRemainingSegment = remainingTextSegment.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = linkedRemainingSegment; 
        while(tempDiv.firstChild) contentDiv.appendChild(tempDiv.firstChild);
    }

    if (groundingChunks && groundingChunks.length > 0) {
        let sourcesContainer = contentDiv.querySelector('.grounding-sources') as HTMLDivElement;
        if (!sourcesContainer) {
            sourcesContainer = document.createElement('div');
            sourcesContainer.className = 'grounding-sources';
            const title = document.createElement('div');
            title.className = 'grounding-sources-title';
            title.textContent = 'Sources:';
            sourcesContainer.appendChild(title);
            const ul = document.createElement('ul');
            sourcesContainer.appendChild(ul);
            contentDiv.appendChild(sourcesContainer);
        }
        
        const ul = sourcesContainer.querySelector('ul') as HTMLUListElement;
        ul.innerHTML = ''; 

        groundingChunks.forEach(chunk => {
            if (chunk.web) {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = chunk.web.uri;
                a.textContent = chunk.web.title || chunk.web.uri;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                li.appendChild(a);
                ul.appendChild(li);
            }
        });
    }

    if (messageList) messageList.scrollTop = messageList.scrollHeight;
}

async function handleImageGeneration(prompt: string) {
    const aiBubble = addMessageToUI('ai', ''); 
    const contentDiv = aiBubble.querySelector('.message-content') as HTMLElement;
    if (contentDiv) {
      contentDiv.innerHTML = '<span class="typing-indicator"><span></span><span></span><span></span></span> Generating image for: "' + prompt + '"...';
    }
    setLoading(true);
    let historyMessage = `[Attempted to generate image for: ${prompt}]`;

    try {
        const response: GenerateImagesResponse = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: prompt,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg' },
        });
        
        if (contentDiv) contentDiv.innerHTML = ''; 

        if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
            const imgHtml = `<img src="${imageUrl}" alt="Generated image: ${prompt}" class="uploaded-image-preview">`;
            if (contentDiv) contentDiv.innerHTML = imgHtml;
            speak(`Image generated for: ${prompt}`);
            historyMessage = `[Image successfully generated for: ${prompt}]`;
        } else {
            if (contentDiv) contentDiv.textContent = `Sorry, I couldn't generate an image for "${prompt}" at this time. This might be due to safety policies or other restrictions.`;
            speak('Sorry, I couldn\'t generate an image at this time.');
            historyMessage = `[Failed to generate image for: ${prompt} - No image returned or safety policy triggered]`;
        }
    } catch (error) {
        console.error('Image generation error:', error);
        if (contentDiv) contentDiv.textContent = `Error generating image: ${(error as Error).message}`;
        speak('An error occurred while generating the image.');
        historyMessage = `[Error generating image for: ${prompt} - ${(error as Error).message}]`;
    } finally {
        setLoading(false);
        currentChatHistory.push({ role: "model", parts: [{text: historyMessage}] });
    }
}

async function handleSummarizeChat() {
    setLoading(true);
    const aiBubble = addMessageToUI('ai', '');
    const contentDiv = aiBubble.querySelector('.message-content') as HTMLElement;
    if (contentDiv) contentDiv.innerHTML = '<span class="typing-indicator"><span></span><span></span><span></span></span> Summarizing chat...';
    
    const chatToSummarize = currentChatHistory.filter(
        (msg: Content) => !(msg.parts[0].text?.startsWith('[Utility:')) && !(msg.parts[0].text?.startsWith('[File Analyzed:')) && !(msg.parts[0].text?.startsWith('[Image Analyzed:'))
    );

    const summaryPrompt = "Please provide a concise summary of the following conversation:\n\n" +
        chatToSummarize.map(msg => `${msg.role === 'user' ? 'User' : 'Zeyn AI'}: ${msg.parts.map(p => p.text || (p.inlineData ? '[Image Data]' : '[Data Part]')).join(' ')}`).join('\n');

    let summaryText = "Sorry, I couldn't summarize the chat at this time.";
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-04-17',
            contents: [{ role: 'user', parts: [{ text: summaryPrompt }] }],
            config: { systemInstruction: "You are a helpful assistant skilled at summarizing text."}
        });
        summaryText = response.text;
        if (contentDiv) updateAiMessageStream(aiBubble, summaryText); // Use update for formatting
    } catch (error) {
        console.error('Summarization error:', error);
        if (contentDiv) updateAiMessageStream(aiBubble, summaryText);
    } finally {
        setLoading(false);
        speak(summaryText);
        currentChatHistory.push({ role: "model", parts: [{text: `[Utility: Chat summary provided]`}] });
    }
}

async function handleTranslateText(textToTranslate: string, targetLanguage: string) {
    setLoading(true);
    const aiBubble = addMessageToUI('ai', '');
    const contentDiv = aiBubble.querySelector('.message-content') as HTMLElement;
    if (contentDiv) contentDiv.innerHTML = `<span class="typing-indicator"><span></span><span></span><span></span></span> Translating "${textToTranslate}" to ${targetLanguage}...`;

    const translationPrompt = `Translate the following text to ${targetLanguage}: "${textToTranslate}"`;
    let translatedText = `Sorry, I couldn't translate "${textToTranslate}" to ${targetLanguage} at this time.`;
    
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-04-17',
            contents: [{ role: 'user', parts: [{ text: translationPrompt }] }],
            config: { systemInstruction: "You are a highly accurate and fluent translation assistant."}
        });
        translatedText = response.text;
        if (contentDiv) updateAiMessageStream(aiBubble, `Translation to ${targetLanguage}: ${translatedText}`);
    } catch (error) {
        console.error('Translation error:', error);
         if (contentDiv) updateAiMessageStream(aiBubble, translatedText);
    } finally {
        setLoading(false);
        speak(translatedText);
        currentChatHistory.push({ role: "model", parts: [{text: `[Utility: Translated "${textToTranslate}" to ${targetLanguage}]`}] });
    }
}

function handleDiceRoll() {
    const roll = Math.floor(Math.random() * 6) + 1;
    const resultText = `You rolled a ${roll}.`;
    addMessageToUI('ai', resultText);
    speak(resultText);
    currentChatHistory.push({ role: "model", parts: [{text: `[Utility: Dice rolled, result: ${roll}]`}] });
}

function handleCoinFlip() {
    const flip = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const resultText = `It's ${flip}!`;
    addMessageToUI('ai', resultText);
    speak(resultText);
    currentChatHistory.push({ role: "model", parts: [{text: `[Utility: Coin flipped, result: ${flip}]`}] });
}

function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getFileIcon(fileType: string, fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (fileType.startsWith('image/')) {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>`; // Image icon
    }
    if (extension === 'pdf' || fileType === 'application/pdf') {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path fill-rule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9H12A2.25 2.25 0 019.75 6.75V3.375c0-.255-.02-.505-.057-.75H5.625zm5.085 6.127a.75.75 0 01.75-.75h2.165a.75.75 0 010 1.5H11.46a.75.75 0 01-.75-.75zm-.75 2.25a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5zm0 2.25a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5z" clip-rule="evenodd" /><path d="M12.991 8.642a2.251 2.251 0 00-2.904-2.225.75.75 0 10.516 1.422 1.004 1.004 0 011.213.99V12a.75.75 0 00.75.75h2.842A1.005 1.005 0 0116.5 12c.005-.06.01-.119.01-.179a.75.75 0 00-1.42-.516 2.251 2.251 0 00-2.099-2.663z"/></svg>`; // PDF icon
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path fill-rule="evenodd" d="M19.5 2.25a2.25 2.25 0 012.25 2.25v15A2.25 2.25 0 0119.5 21.75H4.5A2.25 2.25 0 012.25 19.5V4.5A2.25 2.25 0 014.5 2.25h15zm-6.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25v2.25a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V11.25z" clip-rule="evenodd" /></svg>`; // Generic file icon
}

async function sendMessageToAI(parts: Part[], userMessageDisplayHtml: string) {
    addMessageToUI('user', userMessageDisplayHtml, true);
    currentChatHistory.push({ role: "user", parts: parts });
    
    userInput.value = '';
    userInput.style.height = 'auto';
    if(fileInput) fileInput.value = ''; // Clear the file input
    hideExamplePrompts();
    setLoading(true);

    const aiBubble = addMessageToUI('ai', '');
    const contentDiv = aiBubble.querySelector('.message-content') as HTMLElement;
    if (contentDiv) contentDiv.innerHTML = '<span class="typing-indicator"><span></span><span></span><span></span></span>';

    let accumulatedText = '';
    let finalGroundingChunks: GroundingChunk[] | undefined = undefined;

    try {
        if (!chat) initializeChat(); // Ensure chat is initialized
        const stream = await chat!.sendMessageStream({ message: parts } as SendMessageParameters); // Send parts directly
        
        for await (const chunk of stream) {
            if (chunk.text) {
                accumulatedText += chunk.text;
            }
            if (chunk.candidates && chunk.candidates[0]?.groundingMetadata?.groundingChunks) {
                finalGroundingChunks = chunk.candidates[0].groundingMetadata.groundingChunks;
            }
            updateAiMessageStream(aiBubble, accumulatedText, finalGroundingChunks);
        }
    } catch (error) {
        console.error('Error sending message with file:', error);
        accumulatedText = `Sorry, an error occurred processing your request: ${(error as Error).message}`;
        updateAiMessageStream(aiBubble, accumulatedText);
    } finally {
        setLoading(false);
        speak(accumulatedText);
        currentChatHistory.push({ role: "model", parts: [{ text: accumulatedText }] });
    }
}


async function handleFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
        return;
    }
    const file = input.files[0];
    const userPromptText = userInput.value.trim();
    const parts: Part[] = [];
    let userMessageDisplayHtml = '';

    setLoading(true); // Show loading early

    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            parts.push({ inlineData: { mimeType: file.type, data: base64Data } });
            if (userPromptText) parts.push({ text: userPromptText });
            else parts.push({ text: "Describe this image." });

            userMessageDisplayHtml = `
                <img src="${reader.result as string}" alt="${file.name}" class="uploaded-image-preview">
                ${userPromptText ? `<p>${userPromptText.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')}</p>` : ''}
            `;
            await sendMessageToAI(parts, userMessageDisplayHtml);
            currentChatHistory[currentChatHistory.length - 2].parts.push({text: `[Image Analyzed: ${file.name}]`});

        };
        reader.onerror = () => {
            addMessageToUI('ai', `Error reading image: ${file.name}`);
            setLoading(false);
        }
        reader.readAsDataURL(file);

    } else if (file.type === 'application/pdf') {
        userMessageDisplayHtml = `
            <div class="uploaded-file-info">
                ${getFileIcon(file.type, file.name)}
                <div class="file-details">
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${formatBytes(file.size)}</span>
                </div>
            </div>
            ${userPromptText ? `<p>${userPromptText.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')}</p>` : ''}
        `;
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(item => (item as any).str).join(' ') + '\n';
            }
            const promptForPdf = userPromptText || "Analyze the content of this PDF file. Provide a summary and key insights.";
            parts.push({ text: `${promptForPdf}\n\nPDF Content:\n${fullText}` });
            await sendMessageToAI(parts, userMessageDisplayHtml);
            currentChatHistory[currentChatHistory.length - 2].parts.push({text: `[PDF Analyzed: ${file.name}]`});


        } catch (error) {
            console.error('Error processing PDF:', error);
            addMessageToUI('ai', `Error processing PDF "${file.name}": ${(error as Error).message}`);
            setLoading(false);
        }

    } else if (isTextBasedFile(file.name, file.type)) {
         userMessageDisplayHtml = `
            <div class="uploaded-file-info">
                ${getFileIcon(file.type, file.name)}
                <div class="file-details">
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${formatBytes(file.size)}</span>
                </div>
            </div>
            ${userPromptText ? `<p>${userPromptText.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')}</p>` : ''}
        `;
        const reader = new FileReader();
        reader.onloadend = async () => {
            const fileContent = reader.result as string;
            const promptForTextFile = userPromptText || "Analyze the content of this file. Provide a summary and key insights if applicable.";
            parts.push({ text: `${promptForTextFile}\n\nFile Content:\n${fileContent}` });
            await sendMessageToAI(parts, userMessageDisplayHtml);
            currentChatHistory[currentChatHistory.length - 2].parts.push({text: `[File Analyzed: ${file.name}]`});
        };
        reader.onerror = () => {
            addMessageToUI('ai', `Error reading text file: ${file.name}`);
            setLoading(false);
        }
        reader.readAsText(file);
    } else {
        addMessageToUI('ai', `Unsupported file type: ${file.name} (${file.type}). Please upload an image, PDF, or common text file.`);
        setLoading(false);
        if(fileInput) fileInput.value = ''; // Clear the file input
    }
}

function isTextBasedFile(fileName: string, fileType: string): boolean {
    const textExtensions = [
        '.txt', '.md', '.csv', '.json', '.xml', '.html', '.css', '.js', '.ts', '.jsx', '.tsx', 
        '.py', '.java', '.c', '.cpp', '.h', '.cs', '.php', '.rb', '.go', '.rs', '.swift', 
        '.kt', '.sh', '.yaml', '.yml', '.ini', '.log', '.sql', '.srt', '.vtt'
    ];
    const extension = '.' + fileName.split('.').pop()?.toLowerCase();
    return textExtensions.includes(extension) || fileType.startsWith('text/') || fileType === 'application/json' || fileType === 'application/xml';
}


async function handleSendMessage() {
    if (!userInput) return;
    const userMessage = userInput.value.trim();
    if (!userMessage) return;

    addMessageToUI('user', userMessage);
    currentChatHistory.push({ role: "user", parts: [{ text: userMessage }] });
    userInput.value = '';
    userInput.style.height = 'auto';
    hideExamplePrompts();
    setLoading(true);

    const imageGenMatch = userMessage.match(/^(?:generate image|draw|create image|imagine|visualize):\s*(.+)/i);
    const summarizeMatch = userMessage.match(/^(summarize chat|summarize our conversation|give me a summary)$/i);
    const translateMatch = userMessage.match(/^translate\s+"([^"]+)"\s+to\s+(\w+)$/i);
    const diceRollMatch = userMessage.match(/^(roll a dice|roll dice)$/i);
    const coinFlipMatch = userMessage.match(/^(flip a coin|coin flip)$/i);

    if (imageGenMatch) {
        handleImageGeneration(imageGenMatch[1].trim());
        return;
    }
    if (summarizeMatch) {
        handleSummarizeChat();
        return;
    }
    if (translateMatch) {
        handleTranslateText(translateMatch[1], translateMatch[2]);
        return;
    }
    if (diceRollMatch) {
        handleDiceRoll();
        setLoading(false);
        return;
    }
    if (coinFlipMatch) {
        handleCoinFlip();
        setLoading(false);
        return;
    }

    const searchKeywords = ["what is", "who is", "explain", "define", "latest", "news", "current", "update", "stock price", "weather in", "how to", "when did", "who won"];
    const requiresSearch = searchKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));

    const aiBubble = addMessageToUI('ai', '');
    const contentDiv = aiBubble.querySelector('.message-content') as HTMLElement;
    if (contentDiv) contentDiv.innerHTML = '<span class="typing-indicator"><span></span><span></span><span></span></span>';

    let accumulatedText = '';
    let finalGroundingChunks: GroundingChunk[] | undefined = undefined;

    try {
        let stream;
        const messageParts: Part[] = [{ text: userMessage }];

        if (requiresSearch) {
            stream = await ai.models.generateContentStream({
                model: 'gemini-2.5-flash-preview-04-17',
                contents: [...currentChatHistory], // Send full local history
                config: {
                    systemInstruction: initialSystemInstruction,
                    tools: [{ googleSearch: {} }],
                }
            });
        } else {
            if (!chat) initializeChat(); 
            stream = await chat!.sendMessageStream({ message: messageParts } as SendMessageParameters);
        }
        
        for await (const chunk of stream) {
            if (chunk.text) {
                accumulatedText += chunk.text;
            }
            if (chunk.candidates && chunk.candidates[0]?.groundingMetadata?.groundingChunks) {
                finalGroundingChunks = chunk.candidates[0].groundingMetadata.groundingChunks;
            }
            updateAiMessageStream(aiBubble, accumulatedText, finalGroundingChunks);
        }
    } catch (error) {
        console.error('Error sending message:', error);
        accumulatedText = `Sorry, an error occurred: ${(error as Error).message}`;
        updateAiMessageStream(aiBubble, accumulatedText);
    } finally {
        setLoading(false);
        speak(accumulatedText);
        currentChatHistory.push({ role: "model", parts: [{ text: accumulatedText }] });
    }
}

const examplePrompts = [
    "What are the key differences between nuclear fission and fusion?",
    "generate image: a serene bioluminescent forest at night",
    "Write a short poem about the passage of time.",
    "Explain the concept of dark matter in simple terms.",
    "translate \"Hello world\" to Japanese",
    "summarize chat"
];

function displayExamplePrompts() {
    if (!examplePromptsContainer || messageList?.children.length > 1) { 
        hideExamplePrompts();
        return;
    }
    examplePromptsContainer.innerHTML = '<div class="example-prompts-title">Try asking:</div>';
    examplePrompts.forEach(promptText => {
        const promptDiv = document.createElement('div');
        promptDiv.classList.add('example-prompt');
        promptDiv.textContent = promptText;
        promptDiv.onclick = () => {
            userInput.value = promptText;
            hideExamplePrompts();
            handleSendMessage();
        };
        examplePromptsContainer.appendChild(promptDiv);
    });
    examplePromptsContainer.classList.remove('hidden');
}

function hideExamplePrompts() {
    if (examplePromptsContainer) {
        examplePromptsContainer.classList.add('hidden');
    }
}

if (sendBtn && userInput) {
    sendBtn.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    });
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = `${Math.min(userInput.scrollHeight, 120)}px`; 
    });
}

if (voiceInputBtn && recognition) {
    voiceInputBtn.addEventListener('click', () => {
        if (voiceInputBtn.classList.contains('recording')) {
            recognition.stop();
        } else {
            try {
                recognition.start();
            } catch (e) {
                console.error("Error starting recognition:", e);
            }
        }
    });
}

if (fileUploadBtn && fileInput) {
    fileUploadBtn.addEventListener('click', () => {
        fileInput.click(); 
    });
    fileInput.addEventListener('change', handleFileSelected);
}


if (clearChatBtn) {
    clearChatBtn.addEventListener('click', () => {
        if (messageList) messageList.innerHTML = '';
        initializeChat();
        const initialGreeting = "Hello! I'm Zeyn AI. How can I assist you today?";
        addMessageToUI('ai', initialGreeting);
        speak(initialGreeting);
        currentChatHistory.push({ role: "model", parts: [{text: initialGreeting}] });
        displayExamplePrompts();
    });
}

if (exportChatBtn) {
    exportChatBtn.addEventListener('click', () => {
        let chatText = "Zeyn AI Chat History\n";
        chatText += `Exported on: ${new Date().toLocaleString()}\n\n`;

        messageList.querySelectorAll('.message-bubble').forEach(bubble => {
            const sender = bubble.querySelector('strong')?.textContent || 'Unknown';
            const contentDiv = bubble.querySelector('.message-content');
            let message = '';
            if (contentDiv) {
                const imgPreview = contentDiv.querySelector('img.uploaded-image-preview');
                const fileInfo = contentDiv.querySelector('.uploaded-file-info .file-name');

                if (imgPreview) {
                    message = `[Image: ${imgPreview.getAttribute('alt') || 'Uploaded Image'}]`;
                    const promptText = contentDiv.querySelector('p')?.textContent;
                    if(promptText) message += `\nPrompt: ${promptText}`;

                } else if (fileInfo) {
                    message = `[File: ${fileInfo.textContent || 'Uploaded File'}]`;
                     const promptText = contentDiv.querySelector('p')?.textContent;
                    if(promptText) message += `\nPrompt: ${promptText}`;
                }
                else {
                    message = (contentDiv.textContent || '').trim();
                }
            }
            chatText += `${sender}:\n${message}\n\n`;
        });

        const blob = new Blob([chatText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
        a.download = `ZeynAI_Chat_${timestamp}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

initializeChat();
const initialGreeting = "Hello! I'm Zeyn AI. How can I assist you today? You can now also upload images, PDFs, and text files for analysis!";
addMessageToUI('ai', initialGreeting);
// speak(initialGreeting); 
currentChatHistory.push({ role: "model", parts: [{text: initialGreeting}] });
displayExamplePrompts();