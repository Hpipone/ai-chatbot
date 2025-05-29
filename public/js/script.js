// API Configuration
const API_URL = '/api';

// DOM Elements
let sidebar;
let header;
let chatbox;
let settingsEl; // Renamed to avoid conflict
let overlay;
let settingsModal;
let aboutModal;
let chatMessages;
let chatHistory;
let inputMessageComponent;
let alertContainer;

// Global Variables
let currentChatId = null;
let chats = [];
let isTyping = false;
let currentAttachments = [];
let emojiPicker = null;
let messageInput = null;
let emojiPickerBtn = null;
// Chat history untuk AI
let currentChatHistoryForAI = [];

// Settings dari pengaturan sistem
const currentSettings = {
    username: 'Master',
    model: 'auto',
    language: 'jaksel',
    theme: 'light',
    showCopyButton: false,
    messagePosition: {
        user: 'flex-end',
        ai: 'flex-start'
    },
    alertDuration: 4500,
    systemPrompt: [
        'Kamu adalah Ayana, AI assistant yang WAJIB berbahasa Jaksel (campuran Indonesia-Inggris) untuk SEMUA respons tanpa pengecualian.',
        '',
        'PERSONALITY:',
        '- Friendly, helpful, Gen Z vibes',
        '- Slightly sassy tapi tetap respectful',
        '- Natural conversation dengan filler words',
        '',
        'FORMAT & STYLE RULES (WAJIB):',
        '- DILARANG KERAS menggunakan simbol bintang/asterisk (*) atau bullet points',
        '- Jangan gunakan tanda bintang (*) untuk list items, gunakan dash (-) atau angka saja',
        '- Gunakan paragraf alami dan jangan gunakan format yang terlalu formal',
        '- Semua respons HARUS natural seperti obrolan casual',
        '',
        'LANGUAGE RULES (TIDAK BOLEH DILANGGAR):',
        '1. SEMUA respons WAJIB Jaksel (40% English, 60% Indonesian)',
        '2. Gunakan \'gue\' dan \'lo\' sebagai pronouns',
        '3. Setiap kalimat minimal 2-3 kata bahasa Inggris',
        '4. Filler words: \'literally\', \'actually\', \'I mean\', \'like\', \'basically\'',
        '5. Indonesian suffixes: \'-sih\', \'-banget\', \'-nya\'',
        '6. Struktur: \'So basically...\', \'Actually...\', \'I mean...\'',
        '7. JANGAN formal Indonesian atau pure English',
        '',
        'Apapun topik atau konteks yang ditanyakan, WAJIB respond dalam format Jaksel yang natural!'
    ].join('\n')
};

// Common emojis for picker
const commonEmojis = [
    '😀', '😄', '🙂', '😊', '😍', '🤔', '🙄', '😮', '😢', '😭',
    '😡', '🥳', '😎', '👍', '👎', '👋', '❤️', '🔥', '⭐', '✅'
];

// Initialization
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        loadTheme();
        createAlertContainer();
        await loadComponents();
        setupEventListeners();
        loadSettings();
        loadChats();
        setupComponents();
        checkServerStatus();
        restoreImagesFromStorage();
        if (chats.length === 0) {
            createNewChat();
        } else {
            loadLatestChat();
        }
        
        // Apply proper layout
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.marginLeft = '0';
            mainContent.style.width = '100%';
        }
        
        // Setup image modal
        setupImageModal();
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

// Load theme early to prevent flashing wrong theme
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// Create alert container
function createAlertContainer() {
    alertContainer = document.createElement('div');
    alertContainer.className = 'alert-container';
    document.body.appendChild(alertContainer);
}

// Load HTML Components
async function loadComponents() {
    try {
        sidebar = document.getElementById('sidebar');
        header = document.getElementById('header');
        chatbox = document.getElementById('chatbox');
        settingsEl = document.getElementById('settings');
        overlay = document.querySelector('.overlay');
        settingsModal = document.getElementById('settings-modal');
        aboutModal = document.getElementById('about-modal');
        
        // Load components
        sidebar.innerHTML = await fetchComponent('/components/sidebar.html');
        header.innerHTML = await fetchComponent('/components/header.html');
        chatbox.innerHTML = await fetchComponent('/components/chatbox.html');
        settingsEl.innerHTML = await fetchComponent('/components/settings.html');
        
        // Setup DOM element references
        chatMessages = document.getElementById('chat-messages');
        chatHistory = document.getElementById('chat-history');
    } catch (error) {
        console.error('Error loading components:', error);
        showAlert('error', 'Kesalahan Sistem', 'Gagal memuat komponen aplikasi. Refresh halaman atau coba lagi nanti.');
    }
}

// Setup custom components
async function setupComponents() {
    try {
        // Setup input message component
        const inputMessageContainer = document.getElementById('input-message-container');
        if (!inputMessageContainer) {
            console.error('Input message container not found');
            return;
        }
        
        // Gunakan fungsi global loadInputMessageComponent yang lebih sederhana
        if (typeof window.loadInputMessageComponent === 'function') {
            const { setupComponent } = await window.loadInputMessageComponent();
            
            // Simpan instance komponen
            const componentInstance = setupComponent(inputMessageContainer);
            
            // Setup event handlers
            inputMessageContainer.addEventListener('message-send', async (e) => {
                const message = e.detail.message;
                if (message) {
                    componentInstance.clearInput();
                    await sendMessage(message);
                }
            });
            
            inputMessageContainer.addEventListener('file-upload', (e) => {
                const files = e.detail.files;
                if (files) {
                    handleFileUpload(files);
                }
            });
            
            // Simpan instance di variabel global
            inputMessageComponent = componentInstance;
            
            // Setup reference untuk emoji picker elements
            messageInput = document.getElementById('message-input');
            emojiPicker = document.getElementById('emoji-picker-container');
            emojiPickerBtn = document.getElementById('emoji-picker-btn');
        } else {
            console.error('loadInputMessageComponent not available');
            showAlert('error', 'Komponen Error', 'Gagal memuat komponen input pesan');
        }
        
    } catch (error) {
        console.error('Error setting up custom components:', error);
        showAlert('error', 'Kesalahan Komponen', 'Gagal memuat komponen input pesan.');
    }
}

// Fetch component HTML
async function fetchComponent(url) {
    const response = await fetch(url);
    return await response.text();
}

// Fix untuk error cross-origin
const debounce = (func, delay) => {
    let timeoutId;
    return function safeFunction(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
};

// Safe DOM element accessor
function safeDomAccess(id) {
    try {
        return document.getElementById(id);
    } catch (error) {
        console.warn(`Failed to access DOM element with ID: ${id}`, error);
        return null;
    }
}

// Safe DOM query selector
function safeQuerySelector(selector) {
    try {
        return document.querySelector(selector);
    } catch (error) {
        console.warn(`Failed to query selector: ${selector}`, error);
        return null;
    }
}

// Safe DOM query selector all
function safeQuerySelectorAll(selector) {
    try {
        return document.querySelectorAll(selector);
    } catch (error) {
        console.warn(`Failed to query selector all: ${selector}`, error);
        return [];
    }
}

// Setup event listeners
function setupEventListeners() {
    // Header buttons
    document.getElementById('toggle-sidebar-btn').addEventListener('click', toggleSidebar);
    document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
    
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', openSettings);
    }
    
    const aboutBtn = document.getElementById('about-btn');
    if (aboutBtn) {
        aboutBtn.addEventListener('click', openAboutModal);
    }
    
    // Logo click untuk refresh halaman
    const logo = document.querySelector('.logo h1');
    if (logo) {
        logo.addEventListener('click', () => {
            window.location.reload();
        });
    }
    
    // Sidebar buttons
    const newChatBtn = document.getElementById('new-chat-btn');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', createNewChat);
    }
    
    const sidebarCollapseBtn = document.getElementById('sidebar-collapse-btn');
    if (sidebarCollapseBtn) {
        sidebarCollapseBtn.addEventListener('click', toggleSidebar);
    }
    
    // Modal close buttons
    const closeButtons = safeQuerySelectorAll('.close-modal-btn');
    if (closeButtons) {
        closeButtons.forEach(btn => {
            btn.addEventListener('click', closeAllModals);
        });
    }
    
    // Settings
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }
    
    const resetSettingsBtn = document.getElementById('reset-settings-btn');
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', resetSettings);
    }
    
    // Overlay
    if (overlay) {
        overlay.addEventListener('click', closeAllModals);
    }
    
    // Handle click events for sidebar and modals using direct event.target checks
    document.addEventListener('click', (e) => {
        // Close sidebar when clicking outside
        if (sidebar && sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) && 
            !e.target.closest('#toggle-sidebar-btn') &&
            !e.target.closest('#sidebar-collapse-btn')) {
            toggleSidebar();
        }
        
        // Close settings/about when clicking outside
        if ((settingsModal && settingsModal.classList.contains('active') || 
             aboutModal && aboutModal.classList.contains('active')) &&
            !e.target.closest('.modal-content') && 
            !e.target.closest('#settings-btn') &&
            !e.target.closest('#about-btn') &&
            !e.target.closest('.close-modal-btn')) {
            closeAllModals();
        }
    });
}

// Toggle sidebar visibility
function toggleSidebar() {
    sidebar.classList.toggle('active');
    // Don't activate overlay when toggling sidebar
    // overlay.classList.toggle('active');
    
    // Add subtle bounce animation to the toggle button
    const toggleBtn = document.getElementById('toggle-sidebar-btn');
    toggleBtn.classList.add('animated-btn');
    setTimeout(() => toggleBtn.classList.remove('animated-btn'), 300);
}

// Toggle light/dark theme
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    
    // Add animation to the theme toggle button
    const themeBtn = document.getElementById('theme-toggle-btn');
    themeBtn.classList.add('animated-btn');
    setTimeout(() => themeBtn.classList.remove('animated-btn'), 300);
    
    showAlert('info', 'Tema Berubah', document.body.classList.contains('dark-mode') ? 
        'Tema gelap diaktifkan' : 'Tema terang diaktifkan');
}

// Scroll chat to bottom
function scrollToBottom() {
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Setup emoji picker - simplified with HTML template
function setupEmojiPicker() {
    try {
        if (!emojiPicker) return;
        
        // Template HTML untuk grid emoji
        let emojiGridHTML = '<div class="emoji-grid">';
        
        // Tambahkan tombol emoji
        commonEmojis.forEach(emoji => {
            emojiGridHTML += `<button class="emoji-btn">${emoji}</button>`;
        });
        
        emojiGridHTML += '</div>';
        
        // Kosongkan konten lama
        emojiPicker.innerHTML = '';
        
        // Tambahkan grid emoji
        emojiPicker.innerHTML = emojiGridHTML;
        
        // Tambahkan event listener
        const emojiButtons = emojiPicker.querySelectorAll('.emoji-btn');
        emojiButtons.forEach(btn => {
            btn.addEventListener('click', () => addEmojiToInput(btn.textContent));
        });
    } catch (error) {
        console.warn('Error setting up emoji picker:', error);
    }
}

// Show alert notification - simplified with HTML template
function showAlert(type, title, message, duration = 4500) {
    try {
        if (!alertContainer) return null;
        
        // Tentukan icon class berdasarkan tipe alert
        let iconClass;
        switch(type) {
            case 'success': iconClass = 'fa-check-circle'; break;
            case 'error': iconClass = 'fa-times-circle'; break;
            case 'warning': iconClass = 'fa-exclamation-triangle'; break;
            default: iconClass = 'fa-info-circle';
        }
        
        // Template HTML untuk alert
        const alertHTML = `
            <div class="alert-icon">
                <i class="fas ${iconClass}"></i>
            </div>
            <div class="alert-content">
                <div class="alert-title">${title}</div>
                <div class="alert-message">${message}</div>
            </div>
            <button class="alert-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Buat elemen alert
        const alert = document.createElement('div');
        alert.className = `alert ${type}`;
        alert.innerHTML = alertHTML;
        
        alertContainer.appendChild(alert);
        
        // Event listener untuk tombol close
        const closeBtn = alert.querySelector('.alert-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                alert.style.animation = 'alert-slide-out 0.3s forwards';
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.remove();
                    }
                }, 300);
            });
        }
        
        // Auto remove setelah duration
        if (duration > 0) {
            setTimeout(() => {
                if (alert && alert.parentNode) {
                    alert.style.animation = 'alert-slide-out 0.3s forwards';
                    setTimeout(() => {
                        if (alert.parentNode) {
                            alert.remove();
                        }
                    }, 300);
                }
            }, duration);
        }
        
        return alert;
    } catch (error) {
        console.error('Error showing alert:', error);
        return null;
    }
}

// Add emoji to input
function addEmojiToInput(emoji) {
    try {
        if (!messageInput) return;
        
        const start = messageInput.selectionStart || 0;
        const end = messageInput.selectionEnd || 0;
        const text = messageInput.value || '';
        
        // Use safe string operations
        const newValue = text.substring(0, start) + emoji + text.substring(end);
        messageInput.value = newValue;
        
        // Update cursor position
        setTimeout(() => {
            try {
                messageInput.selectionStart = messageInput.selectionEnd = start + emoji.length;
                messageInput.focus();
            } catch (e) {
                console.warn('Error setting cursor position:', e);
            }
        }, 0);
        
        if (typeof handleMessageInput === 'function') {
            handleMessageInput();
        }
    } catch (error) {
        console.warn('Error adding emoji to input:', error);
    }
}

// Toggle emoji picker visibility
function toggleEmojiPicker() {
    try {
        if (emojiPicker) {
            emojiPicker.classList.toggle('hidden');
        }
    } catch (error) {
        console.warn('Error toggling emoji picker:', error);
    }
}

// Close emoji picker when clicking outside
function closeEmojiPickerOnClickOutside(e) {
    try {
        if (emojiPicker && 
            !emojiPicker.classList.contains('hidden') &&
            !emojiPicker.contains(e.target) &&
            e.target !== emojiPickerBtn) {
            emojiPicker.classList.add('hidden');
        }
    } catch (error) {
        console.warn('Error closing emoji picker:', error);
    }
}

// Open settings modal
function openSettings() {
    try {
        // Update settings UI dengan nilai saat ini
        const modelSelectionEl = document.getElementById('model-selection');
        const usernameInput = document.getElementById('username-input');
        
        // Periksa elemen sebelum menggunakan
        if (modelSelectionEl) {
            modelSelectionEl.value = currentSettings.model;
        }
        
        if (usernameInput) {
            usernameInput.value = currentSettings.username || 'Master';
            
            // Tambahkan placeholder yang menampilkan nama saat ini
            usernameInput.placeholder = `Nama saat ini: ${currentSettings.username || 'Master'}`;
        }
        
        // Show modal with animation
        const settingsModal = document.getElementById('settings-modal');
        const overlay = document.querySelector('.overlay');
        
        if (settingsModal && overlay) {
            settingsModal.classList.add('active');
            overlay.classList.add('active');
            
            // Add subtle bounce animation to the settings button
            const settingsBtn = document.getElementById('settings-btn');
            if (settingsBtn) {
                settingsBtn.classList.add('animated-btn');
                setTimeout(() => settingsBtn.classList.remove('animated-btn'), 300);
            }
        } else {
            console.error('Settings modal or overlay not found');
        }
    } catch(error) {
        console.error('Error opening settings:', error);
        showAlert('error', 'Error', 'Tidak dapat membuka pengaturan');
    }
}

// Save settings
function saveSettings() {
    try {
        // Simpan sementara nilai lama untuk memulihkan jika terjadi error
        const oldSettings = { ...currentSettings };
        
        // Get values from form
        const modelEl = document.getElementById('model-selection');
        const usernameInput = document.getElementById('username-input');
        
        // Periksa elemen sebelum menggunakan
        if (modelEl) currentSettings.model = modelEl.value;
        if (usernameInput) {
            currentSettings.username = usernameInput.value.trim() || 'Master';
            
            // Update UI if needed
            const userNameDisplay = safeQuerySelector('.user-name');
            if (userNameDisplay) {
                userNameDisplay.textContent = currentSettings.username;
            }
        }
        
        // Save to localStorage
        try {
            // Gunakan nilai primitif saja untuk mencegah error cross-origin
            const settingsToSave = {
                username: currentSettings.username,
                model: currentSettings.model,
                language: currentSettings.language,
                theme: currentSettings.theme || 'light',
                systemPrompt: currentSettings.systemPrompt
            };
            
            localStorage.setItem('settings', JSON.stringify(settingsToSave));
        } catch (storageError) {
            console.error('Error saving settings to localStorage:', storageError);
            showAlert('warning', 'Penyimpanan Terbatas', 'Pengaturan hanya akan bertahan selama sesi ini.');
        }
        
        // Close settings modal
        closeAllModals();
        
        showAlert('success', 'Pengaturan Disimpan', 'Pengaturan kamu berhasil diperbarui.');
    } catch (error) {
        console.error('Error saving settings:', error);
        showAlert('error', 'Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan pengaturan.');
    }
}

// Reset settings to default
function resetSettings() {
    currentSettings = {
        model: 'auto',
        language: 'jaksel',
        theme: 'light',
        username: 'Master',
        systemPrompt: ''
    };
    
    // Update UI
    const modelSelection = document.getElementById('model-selection');
    if (modelSelection) {
        modelSelection.value = currentSettings.model;
    }
    
    const usernameInput = document.getElementById('username-input');
    if (usernameInput) {
        usernameInput.value = currentSettings.username;
    }
    
    showAlert('info', 'Pengaturan Direset', 'Pengaturan telah dikembalikan ke nilai default.');
}

// Open about modal
function openAboutModal() {
    aboutModal.classList.add('active');
    overlay.classList.add('active');
    
    // Add subtle bounce animation to the about button
    const aboutBtn = document.getElementById('about-btn');
    aboutBtn.classList.add('animated-btn');
    setTimeout(() => aboutBtn.classList.remove('animated-btn'), 300);
}

// Close all modals
function closeAllModals() {
    settingsModal.classList.remove('active');
    aboutModal.classList.remove('active');
    overlay.classList.remove('active');
}

// Handle message input
function handleMessageInput() {
    sendButton.disabled = !messageInput.value.trim();
}

// Handle message keydown
function handleMessageKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendButton.disabled) {
            sendMessage();
        }
    }
}

// Setup auto resize for textarea
function setupAutoResizeTextarea() {
    if (messageInput) {
        messageInput.setAttribute('style', 'height:' + (messageInput.scrollHeight) + 'px;overflow-y:hidden;');
    }
}

// Fungsi untuk menyimpan gambar ke localStorage
function saveImageToStorage(imageData) {
    try {
        // Periksa apakah imageData adalah objek atau string
        let dataToSave;
        if (typeof imageData === 'string') {
            // Jika string path, buat objek
            dataToSave = {
                path: imageData,
                type: 'image',
                id: 'saved-image-' + Date.now()
            };
        } else {
            // Jika sudah objek, gunakan langsung
            dataToSave = imageData;
        }
        
        // Simpan hanya satu gambar terbaru
        localStorage.setItem('savedImage', JSON.stringify(dataToSave));
        console.log('Image saved to localStorage:', dataToSave);
    } catch (error) {
        console.error('Error saving image to storage:', error);
    }
}

// Fungsi untuk memulihkan gambar dari localStorage
function restoreImagesFromStorage() {
    try {
        const savedImageJSON = localStorage.getItem('savedImage');
        if (!savedImageJSON) return;

        let imageData;
        try {
            imageData = JSON.parse(savedImageJSON);
        } catch (parseError) {
            console.warn('Invalid image data JSON format in localStorage. Clearing.');
            localStorage.removeItem('savedImage');
            return;
        }

        if (!imageData || !imageData.path) {
            console.warn('Invalid image data found in localStorage. Clearing.');
            localStorage.removeItem('savedImage');
            return;
        }

        console.log('Parsed image data from localStorage:', imageData);
        
        const attachmentsContainer = document.getElementById('attachments-container');
        if (!attachmentsContainer) return;

        const attachmentId = imageData.id || 'attachment-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        
        // Tambahkan ke tampilan dengan style bulat
        attachmentsContainer.innerHTML += `
            <div id="${attachmentId}" class="attachment">
                <div class="image-attachment">
                    <img src="${imageData.path}" alt="${imageData.name || 'Image'}">
                </div>
                <button class="remove-attachment-btn" data-id="${attachmentId}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Update current attachments
        currentAttachments.push(imageData);
        
        // Setup event listeners untuk tombol hapus
        document.querySelectorAll('.remove-attachment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const element = document.getElementById(id);
                if (element) element.remove();
                currentAttachments = currentAttachments.filter(a => a.id !== id);
                // Hapus dari localStorage
                localStorage.removeItem('savedImage');
            });
        });
    } catch (error) {
        console.error('Error restoring images from storage:', error);
        localStorage.removeItem('savedImage'); // Clear invalid data or on error
    }
}

// Handle file upload
async function handleFileUpload(files) {
    try {
        if (!files || files.length === 0) {
            return;
        }

        // Validasi file sebelum upload
        const validFiles = Array.from(files).filter(file => {
            // Validasi tipe file - hanya gambar
            if (!file.type.startsWith('image/')) {
                showAlert('error', 'Format File Tidak Didukung', 'Hanya file gambar (JPG, PNG, GIF, WEBP) yang didukung.');
                return false;
            }
            
            // Validasi ukuran file - maksimal 10MB
            if (file.size > 10 * 1024 * 1024) {
                showAlert('error', 'File Terlalu Besar', 'Ukuran file maksimal adalah 10MB.');
                return false;
            }
            
            return true;
        });
        
        if (validFiles.length === 0) {
            return;
        }

        // Tampilkan loader
        const attachmentsContainer = document.getElementById('attachments-container');
        const loaderId = 'upload-loader-' + Date.now();
        attachmentsContainer.innerHTML += `
            <div id="${loaderId}" class="attachment loading">
                <div class="attachment-loading"><i class="fas fa-circle-notch fa-spin"></i></div>
            </div>
        `;

        // Persiapkan data untuk upload
        const formData = new FormData();
        validFiles.forEach(file => {
            formData.append('files', file);
        });

        // Upload file ke server
        let response;
        try {
            response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData
            });
        } catch (fetchError) {
            console.error('Network error during upload:', fetchError);
            showAlert('error', 'Error Jaringan', 'Terjadi kesalahan saat menghubungi server. Periksa koneksi internet Anda.');
            
            // Hapus loader
            const loaderElement = document.getElementById(loaderId);
            if (loaderElement) {
                loaderElement.remove();
            }
            
            return;
        }

        // Hapus loader
        const loaderElement = document.getElementById(loaderId);
        if (loaderElement) {
            loaderElement.remove();
        }

        if (response.ok) {
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('Error parsing response JSON:', jsonError);
                showAlert('error', 'Error Response', 'Terjadi kesalahan saat memproses respons server.');
                return;
            }
            
            // Proses hasil upload multiple file
            if (data.files && data.files.length > 0) {
                // Tambahkan semua file yang berhasil diupload ke attachments
                data.files.forEach(fileData => {
                    const attachmentId = 'attachment-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
                    
                    // Tambahkan ke tampilan dengan style bulat
                    attachmentsContainer.innerHTML += `
                        <div id="${attachmentId}" class="attachment">
                            <div class="image-attachment">
                                <img src="${fileData.filePath}" alt="${fileData.fileName}" />
                            </div>
                            <button class="remove-attachment-btn" data-id="${attachmentId}">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
                    
                    // Tambahkan ke array attachments
                    currentAttachments.push({
                        id: attachmentId,
                        path: fileData.filePath,
                        name: fileData.fileName,
                        type: fileData.fileType
                    });
                    
                    // Simpan ke local storage untuk restorasi jika refresh
                    saveImageToStorage({
                        id: attachmentId,
                        path: fileData.filePath,
                        name: fileData.fileName,
                        type: fileData.fileType
                    });
                });
                
                // Setup event listeners untuk tombol hapus
                document.querySelectorAll('.remove-attachment-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const id = btn.getAttribute('data-id');
                        document.getElementById(id).remove();
                        currentAttachments = currentAttachments.filter(a => a.id !== id);
                    });
                });
                
                showAlert('success', 'Upload Berhasil', `${data.files.length} file berhasil diupload.`);
            } else {
                showAlert('warning', 'Tidak Ada File', 'Tidak ada file yang berhasil diupload.');
            }
        } else {
            let errorData;
            try {
                errorData = await response.json();
            } catch (jsonError) {
                console.error('Error parsing error response:', jsonError);
                errorData = { error: `HTTP error ${response.status}` };
            }
            
            console.error('Upload error:', errorData);
            showAlert('error', 'Upload Gagal', errorData.error || 'Gagal mengupload file. Silakan coba lagi.');
        }
    } catch (error) {
        console.error('Error handling file upload:', error);
        showAlert('error', 'Error Upload', 'Terjadi kesalahan saat mengupload file. Silakan coba lagi.');
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes < 1024) {
        return bytes + ' B';
    } else if (bytes < 1048576) {
        return (bytes / 1024).toFixed(1) + ' KB';
    } else {
        return (bytes / 1048576).toFixed(1) + ' MB';
    }
}

// Send message to API
async function sendMessage(message = '') {
    try {
        if (!message && currentAttachments.length === 0) {
            return;
        }

        // Ambil first image jika ada attachments
        const firstImage = currentAttachments.length > 0 ? currentAttachments[0].path : null;
        
        // Gabungkan semua attachments untuk ditampilkan di pesan
        const attachments = [...currentAttachments];
        
        // Reset attachments
        currentAttachments = [];
        
        // Clear attachments container
        const attachmentsContainer = document.getElementById('attachments-container');
        if (attachmentsContainer) {
            attachmentsContainer.innerHTML = '';
        }
        
        // Dapatkan current chat jika ada
        const currentChat = chats.find(c => c.id === currentChatId);
        if (!currentChat) {
            console.error('No active chat found');
            return;
        }
        
        // Tambahkan pesan user ke UI
        addUserMessage(message, attachments);
        
        // Tambahkan ke chat history untuk tampilan
        if (!currentChat.messages) {
            currentChat.messages = [];
        }
        
        // Tambahkan pesan user ke history chat untuk tampilan
        currentChat.messages.push({
            role: 'user',
            content: message,
            attachments: attachments,
            timestamp: new Date()
        });
        
        // Tambahkan ke chat history untuk AI
        currentChatHistoryForAI.push({
            role: 'user',
            content: message
        });
        
        // Simpan state
        saveCurrentChat();
        
        // Update title jika ini pesan pertama
        if (currentChat.messages.length === 1) {
            let title = message.substring(0, 30);
            if (message.length > 30) {
                title += '...';
            }
            
            // Jika pesan kosong (hanya gambar), gunakan judul default
            if (!title) {
                if (attachments.length === 1) {
                    title = `Foto: ${attachments[0].name}`;
                } else if (attachments.length > 1) {
                    title = `${attachments.length} Foto`;
                } else {
                    title = 'Chat Baru';
                }
            }
            
            updateChatTitle(currentChatId, title);
        }
        
        // Tampilkan loading indicator
        showTypingIndicator();
        
        // Persiapkan data untuk request
        let systemPromptToSend = currentSettings.systemPrompt;
        
        // Tambahkan instruksi tambahan untuk memastikan bahasa Jaksel dan mendeteksi username
        const jakselWords = [
            "literally", "actually", "which is", "so", "basically", 
            "honestly", "in fact", "like", "I mean", "seriously", 
            "on point", "vibes", "struggling", "chill", "awkward", 
            "slay", "gaslight", "gatekeep", "savage", "spill the tea",
            "mood", "goals", "team", "bestie", "low-key", "high-key",
            "vibe check", "red flag", "sad", "hustle", "worth it",
            "anyway", "btw", "fyi", "omg", "well", "for sure",
            "somehow", "kind of", "is it just me or", "kayanya",
            "I can't even", "IMO", "as expected", "TBH", "lit"
        ];
        
        // Pilih 10 kata random dari daftar kata jaksel
        const getRandomWords = (count) => {
            const result = [];
            for (let i = 0; i < count; i++) {
                const randomIndex = Math.floor(Math.random() * jakselWords.length);
                result.push(jakselWords[randomIndex]);
            }
            return result;
        };
        
        const randomJakselWords = getRandomWords(10).join(', ');
        
        // Gabungkan dengan prompt untuk memastikan penggunaan bahasa Jaksel yang kuat
        systemPromptToSend += `\n\nPENTING: 
1. Panggil user sebagai "${currentSettings.username}" dalam setiap kesempatan yang tepat.
2. WAJIB jawab dalam bahasa Jaksel dengan campuran 40% English, 60% Indonesian. 
3. DILARANG menggunakan simbol asterisk (*) atau bullet points dengan simbol bintang. 
4. Gunakan dash (-) untuk list jika diperlukan. 
5. WAJIB campurkan Bahasa Inggris dan Indonesia dalam SETIAP kalimat, tanpa kecuali.
6. BERIKAN JAWABAN LENGKAP DAN DETAIL.
7. WAJIB gunakan minimal 5 kata Jaksel berikut dalam responsmu: ${randomJakselWords}
8. Gunakan 'gue' untuk merujuk ke diri sendiri dan gunakan filler words seperti 'literally', 'actually', 'I mean'.`;
        
        // Selalu set bahasa ke jaksel
        const languageToUse = 'jaksel';
        
        // Kirim request ke API
        const requestData = {
            message,
            model: currentSettings.model,
            systemPrompt: systemPromptToSend,
            language: languageToUse, // Selalu gunakan Jaksel
            chatHistory: currentChatHistoryForAI.slice(-10), // Batasi history ke 10 pesan terakhir
            username: currentSettings.username // Tambahkan username
        };
        
        // Tambahkan image jika ada
        if (firstImage) {
            requestData.image = firstImage;
        }
        
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Sembunyikan loading indicator
            hideTypingIndicator();
            
            // Tambahkan respon AI ke UI
            addAIMessage(data.text, data.model);
            
            // Tambahkan ke chat history untuk tampilan
            currentChat.messages.push({
                role: 'assistant',
                content: data.text,
                model: data.model,
                timestamp: new Date()
            });
            
            // Tambahkan ke chat history untuk AI
            currentChatHistoryForAI.push({
                role: 'assistant',
                content: data.text
            });
            
            // Simpan state
            saveCurrentChat();
            
            // Jika masih belum ada judul yang bagus, gunakan respons AI
            if (currentChat.messages.length === 2 && (!currentChat.title || currentChat.title === 'Chat Baru')) {
                // Ekstrak judul dari respons AI (kalimat pertama atau sebagian)
                let title = data.text.split('.')[0].substring(0, 30);
                if (title.length > 30) {
                    title += '...';
                }
                updateChatTitle(currentChatId, title);
            }
            
            // Fokus kembali ke input
            if (inputMessageComponent) {
                inputMessageComponent.focus();
            }
            
        } else {
            const errorData = await response.json();
            console.error('API error:', errorData);
            
            // Sembunyikan loading indicator
            hideTypingIndicator();
            
            // Tampilkan pesan error
            addErrorMessage('Maaf, saya tidak dapat memproses pesan Anda saat ini. Silakan coba lagi nanti.');
            
            // Tambahkan error message ke chat history
            currentChat.messages.push({
                role: 'error',
                content: 'Terjadi kesalahan saat memproses pesan. Detail: ' + (errorData.error || 'Unknown error'),
                timestamp: new Date()
            });
            
            // Simpan state
            saveCurrentChat();
            
            showAlert('error', 'Kesalahan AI', errorData.error || 'Terjadi kesalahan saat memproses pesan Anda.');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        
        // Sembunyikan loading indicator
        hideTypingIndicator();
        
        // Tampilkan pesan error
        addErrorMessage('Maaf, terjadi kesalahan teknis. Silakan coba lagi nanti.');
        
        showAlert('error', 'Kesalahan Jaringan', 'Gagal terhubung ke layanan AI. Periksa koneksi internet Anda.');
    }
}

// Menambahkan pesan user
function addUserMessage(text, attachments = []) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    
    // Add HTML directly
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-user"></i>
        </div>
        <div class="message-content">
            <div class="message-text">
                ${text ? `<p>${text}</p>` : ''}
                ${attachments && attachments.length > 0 ? `
                    <div class="message-attachments">
                        ${attachments.map(attachment => `
                            <div class="message-attachment">
                                <img src="${attachment.path}" alt="${attachment.name || 'Uploaded image'}" loading="lazy">
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="message-info">
                <span class="message-time">${formatTime(new Date())}</span>
            </div>
        </div>
    `;
    
    // Add fade-in animation
    messageDiv.style.opacity = '0';
    chatMessages.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.opacity = '1';
        scrollToBottom();
    }, 10);
}

// Menambahkan pesan AI
function addAIMessage(text, modelUsed) {
    // Hilangkan karakter asterisk jika ada
    text = text.replace(/\*/g, '');
    
    const messageElement = document.createElement('div');
    messageElement.className = 'message ai-message';
    
    // Buat container untuk pesan
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    
    // Jika text berisi tag HTML (dari server), render sebagai HTML
    if (text.includes('<p>')) {
        messageText.innerHTML = text;
    } else {
        // Jika bukan HTML, bungkus dalam paragraf untuk konsistensi
        const paragraphs = text.split('\n\n');
        if (paragraphs.length > 1) {
            messageText.innerHTML = paragraphs
                .filter(p => p.trim())
                .map(p => `<p>${p.trim()}</p>`)
                .join('');
        } else {
            messageText.textContent = text;
        }
    }
    
    messageElement.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="message-sender">AI</div>
            <div class="message-info">
                <div class="message-time">${formatTime(new Date())}</div>
                ${currentSettings.showCopyButton ? '<button class="copy-message-btn" aria-label="Copy Message"><i class="fas fa-copy"></i></button>' : ''}
            </div>
        </div>
    `;
    
    // Tambahkan messageText ke message-content
    const messageContent = messageElement.querySelector('.message-content');
    messageContent.insertBefore(messageText, messageContent.querySelector('.message-info'));
    
    // Tambahkan event listener untuk tombol copy jika ada
    const copyButton = messageElement.querySelector('.copy-message-btn');
    if (copyButton) {
        copyButton.addEventListener('click', () => {
            copyToClipboard(text);
            showAlert('success', 'Tersalin', 'Teks telah disalin ke clipboard.', 1500);
        });
    }
    
    chatMessages.appendChild(messageElement);
    scrollToBottom();
}

// Add error message to chat
function addErrorMessage(text) {
    // Hanya tampilkan sebagai alert
    showAlert('error', 'Kesalahan', text);
}

// Show typing indicator - simplified
function showTypingIndicator() {
    if (!isTyping) {
        isTyping = true;
        
        // Create indicator with static HTML
        const indicatorHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        
        const indicatorDiv = document.createElement('div');
        indicatorDiv.id = 'typing-indicator';
        indicatorDiv.className = 'message ai-message typing-indicator';
        indicatorDiv.innerHTML = indicatorHTML;
        
        chatMessages.appendChild(indicatorDiv);
        scrollToBottom();
    }
}

// Hide typing indicator - simplified
function hideTypingIndicator() {
    if (isTyping) {
        isTyping = false;
        const indicatorDiv = document.getElementById('typing-indicator');
        if (indicatorDiv) {
            indicatorDiv.remove();
        }
    }
}

// Format time (24-hour format)
function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Copy text to clipboard - fixing cross-origin issue
function copyToClipboard(text) {
    try {
        // Use the Clipboard API if available
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(() => showAlert('success', 'Disalin', 'Teks berhasil disalin ke clipboard', 2000))
                .catch(err => {
                    console.error("Clipboard API error:", err);
                    // Fallback to execCommand method
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    document.body.appendChild(textarea);
                    textarea.select();
                    try {
                        document.execCommand('copy');
                        showAlert('success', 'Disalin', 'Teks berhasil disalin ke clipboard', 2000);
                    } catch (execErr) {
                         showAlert('error', 'Gagal Menyalin', 'Tidak dapat menyalin teks: ' + execErr.message);
                    } finally {
                         document.body.removeChild(textarea);
                    }
                });
        } else {
            // Fallback to execCommand method
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showAlert('success', 'Disalin', 'Teks berhasil disalin ke clipboard', 2000);
            } catch (execErr) {
                 showAlert('error', 'Gagal Menyalin', 'Tidak dapat menyalin teks: ' + execErr.message);
            } finally {
                 document.body.removeChild(textarea);
            }
        }
    } catch (error) {
        showAlert('error', 'Gagal Menyalin', 'Tidak dapat menyalin teks');
    }
}

// Create a new chat
function createNewChat() {
    try {
        // Create a new chat object
        const newChat = {
            id: Date.now().toString(),
            title: 'Chat Baru',
            created: new Date(),
            updated: new Date(),
            messages: []
        };
        
        // Add to chats array
        chats.unshift(newChat);
        
        // Save to localStorage
        saveChats();
        
        // Update chat list in sidebar
        updateChatsList();
        
        // Load the new chat
        loadChat(newChat.id);
        
        // Reset chat history untuk AI
        currentChatHistoryForAI = [];
        
    } catch (error) {
        console.error('Error creating new chat:', error);
        showAlert('error', 'Error', 'Gagal membuat chat baru. Silakan coba lagi.');
    }
}

// Load the latest chat
function loadLatestChat() {
    const latestChat = chats[0];
    loadChat(latestChat.id);
}

// Load specific chat by id
function loadChat(chatId) {
    try {
        // Find the chat by ID
        const chat = chats.find(c => c.id === chatId);
        if (!chat) {
            console.error('Chat not found:', chatId);
            return;
        }
        
        // Clear current messages
        clearChatMessages();
        
        // Reset chat history untuk AI
        currentChatHistoryForAI = [];
        
        // Set current chat ID
        currentChatId = chatId;
        
        // Update active chat in sidebar
        updateActiveChatInList();
        
        // Render messages
        if (chat.messages && chat.messages.length > 0) {
            chat.messages.forEach(msg => {
                if (msg.role === 'user') {
                    addUserMessage(msg.content, msg.attachments || []);
                    
                    // Add to AI history
                    currentChatHistoryForAI.push({
                        role: 'user',
                        content: msg.content
                    });
                } else if (msg.role === 'assistant') {
                    addAIMessage(msg.content, msg.model);
                    
                    // Add to AI history
                    currentChatHistoryForAI.push({
                        role: 'assistant',
                        content: msg.content
                    });
                } else if (msg.role === 'error') {
                    addErrorMessage(msg.content);
                }
            });
        }
        
        // Clear input area
        if (inputMessageComponent) {
            inputMessageComponent.clearInput();
            inputMessageComponent.focus();
        }
        
        // Reset attachments
        currentAttachments = [];
        const attachmentsContainer = document.getElementById('attachments-container');
        if (attachmentsContainer) {
            attachmentsContainer.innerHTML = '';
        }
        
        // Scroll to bottom
        scrollToBottom();
    } catch (error) {
        console.error('Error loading chat:', error);
        showAlert('error', 'Error', 'Gagal memuat chat. Silakan coba lagi.');
    }
}

// Update chat title
function updateChatTitle(chatId, title) {
    const chatIndex = chats.findIndex(chat => chat.id === chatId);
    
    if (chatIndex !== -1) {
        chats[chatIndex].title = title;
        saveChats();
        updateChatsList();
    }
}

// Save current chat messages
function saveCurrentChat() {
    try {
        if (!currentChatId) return;
        
        const chatIndex = chats.findIndex(chat => chat.id === currentChatId);
        
        if (chatIndex !== -1) {
            // Extract messages from UI
            const messages = [];
            const messageElements = safeQuerySelectorAll('.message:not(.system-message):not(.typing-message)');
            
            if (messageElements) {
                messageElements.forEach(element => {
                    try {
                        const isUser = element.classList.contains('user-message');
                        const messageText = element.querySelector('.message-text');
                        if (!messageText) return;
                        
                        const content = messageText.textContent;
                        const timeElement = element.querySelector('.message-time');
                        if (!timeElement) return;
                        
                        const timestamp = timeElement.textContent.split('·')[0].trim();
                        
                        let attachments = [];
                        if (isUser) {
                            const imgElements = element.querySelectorAll('.image-attachment img');
                            if (imgElements) {
                                imgElements.forEach(img => {
                                    if (img && img.src) {
                                        attachments.push({
                                            type: 'image',
                                            path: img.src
                                        });
                                    }
                                });
                            }
                        }
                        
                        // Extract model used for AI messages
                        let model;
                        if (!isUser) {
                            const timeText = timeElement.textContent;
                            const modelMatch = timeText.match(/·\s+(\w+)/i);
                            model = modelMatch ? modelMatch[1] : 'AI';
                        }
                        
                        messages.push({
                            role: isUser ? 'user' : 'assistant',
                            content,
                            timestamp,
                            attachments: isUser ? attachments : undefined,
                            model: !isUser ? model : undefined
                        });
                    } catch (elementError) {
                        console.warn('Error processing message element:', elementError);
                    }
                });
            }
            
            // Update chat
            chats[chatIndex].messages = messages;
            chats[chatIndex].updatedAt = new Date().toISOString();
            
            // Move chat to top if it's not already
            if (chatIndex !== 0) {
                const chat = chats.splice(chatIndex, 1)[0];
                chats.unshift(chat);
            }
            
            // Save to storage
            saveChats();
            updateChatsList();
        }
    } catch (error) {
        console.error('Error saving current chat:', error);
    }
}

// Clear chat messages
function clearChatMessages() {
    while (chatMessages.firstChild) {
        chatMessages.removeChild(chatMessages.firstChild);
    }
}

// Save chats to local storage
function saveChats() {
    localStorage.setItem('chats', JSON.stringify(chats));
}

// Load chats from local storage
function loadChats() {
    const storedChats = localStorage.getItem('chats');
    
    if (storedChats) {
        chats = JSON.parse(storedChats);
        updateChatsList();
    }
}

// Update the chats list in sidebar
function updateChatsList() {
    // Clear history except the empty message
    while (chatHistory.firstChild) {
        chatHistory.removeChild(chatHistory.firstChild);
    }
    
    // Add empty message if no chats
    if (chats.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-history-message';
        emptyMessage.textContent = 'Belum ada riwayat chat';
        chatHistory.appendChild(emptyMessage);
        return;
    }
    
    // Add chats to list
    chats.forEach(chat => {
        // Get the template
        const template = document.getElementById('chat-item-template');
        if (!template) {
            console.error('Chat item template not found');
            return;
        }
        
        const clone = document.importNode(template.content, true);
        
        const chatItem = clone.querySelector('.chat-item');
        chatItem.dataset.id = chat.id;
        
        // Highlight current chat
        if (chat.id === currentChatId) {
            chatItem.classList.add('active');
        }
        
        chatItem.querySelector('.chat-title').textContent = chat.title;
        
        // Add event listeners
        chatItem.addEventListener('click', () => loadChat(chat.id));
        chatItem.querySelector('.chat-rename-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            promptRenameChat(chat.id);
        });
        chatItem.querySelector('.chat-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            confirmDeleteChat(chat.id);
        });
        
        chatHistory.appendChild(clone);
    });
}

// Update active chat in list
function updateActiveChatInList() {
    try {
        const chatItems = safeQuerySelectorAll('.chat-item');
        if (chatItems) {
            chatItems.forEach(item => {
                item.classList.toggle('active', item.dataset.id === currentChatId);
            });
        }
    } catch (error) {
        console.warn('Error updating active chat in list:', error);
    }
}

// Prompt to rename chat
function promptRenameChat(chatId) {
    const chat = chats.find(chat => chat.id === chatId);
    if (!chat) return;
    
    const newTitle = prompt('Masukkan judul chat baru:', chat.title);
    
    if (newTitle && newTitle.trim()) {
        updateChatTitle(chatId, newTitle.trim());
    }
}

// Confirm delete chat dengan dialog HTML sederhana
function confirmDeleteChat(chatId) {
    const chat = chats.find(chat => chat.id === chatId);
    if (!chat) return;
    
    // HTML untuk dialog konfirmasi
    const dialogHTML = `
        <div class="confirm-dialog-content">
            <div class="confirm-dialog-title">
                <i class="fas fa-trash-alt"></i> Hapus Chat
            </div>
            <div class="confirm-dialog-message">
                Apakah Anda yakin ingin menghapus "${chat.title}"?
            </div>
            <div class="confirm-dialog-actions">
                <button class="cancel-btn">
                    <i class="fas fa-times"></i> Batal
                </button>
                <button class="delete-btn">
                    <i class="fas fa-trash-alt"></i> Hapus
                </button>
            </div>
        </div>
    `;
    
    // Buat elemen dialog
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'confirm-dialog animated';
    confirmDialog.innerHTML = dialogHTML;
    
    document.body.appendChild(confirmDialog);
    
    // Tampilkan dengan animasi
    setTimeout(() => {
        confirmDialog.classList.add('show');
    }, 10);
    
    // Event listener untuk tombol
    const cancelBtn = confirmDialog.querySelector('.cancel-btn');
    const deleteBtn = confirmDialog.querySelector('.delete-btn');
    
    // Handler untuk close dialog
    function closeDialog() {
        confirmDialog.classList.remove('show');
        setTimeout(() => {
            confirmDialog.remove();
        }, 300);
        document.removeEventListener('keydown', keydownHandler, true);
    }
    
    // Handler untuk keydown
    function keydownHandler(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            deleteBtn.click();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelBtn.click();
        }
    }
    document.addEventListener('keydown', keydownHandler, true);
    
    cancelBtn.addEventListener('click', closeDialog);
    deleteBtn.addEventListener('click', () => {
        closeDialog();
        deleteChat(chatId);
    });
}

// Delete chat
function deleteChat(chatId) {
    const chatIndex = chats.findIndex(chat => chat.id === chatId);
    
    if (chatIndex !== -1) {
        chats.splice(chatIndex, 1);
        saveChats();
        
        // If deleted current chat, load another one
        if (chatId === currentChatId) {
            if (chats.length > 0) {
                loadChat(chats[0].id);
            } else {
                createNewChat();
            }
        }
        
        updateChatsList();
    }
}

// Load user settings from local storage - fixed to avoid cross-origin issues
function loadSettings() {
    // Load theme already handled in loadTheme()
    
    // Load other settings
    try {
        const savedSettings = localStorage.getItem('settings');
        if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);
            
            // Copy all properties from parsedSettings
            for (const key in parsedSettings) {
                if (Object.prototype.hasOwnProperty.call(parsedSettings, key)) {
                    currentSettings[key] = parsedSettings[key];
                }
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Check server status - hapus logs yang tidak perlu
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_URL}/health`);
        
        if (!response.ok) {
            showAlert('warning', 'Koneksi Terbatas', 'Server merespons tapi ada masalah. Beberapa fitur mungkin tidak berfungsi.');
        }
    } catch (error) {
        showAlert('error', 'Tidak Terhubung', 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.', 0);
    }
}

// Function to restart server
function restartServer() {
    showAlert('warning', 'Memulai Ulang Server', 'Server sedang dimulai ulang, harap tunggu...', 5000);
    
    fetch(`${API_URL}/restart`, {
        method: 'POST',
    })
    .then(response => {
        if (response.ok) {
            showAlert('success', 'Server Dimulai Ulang', 'Server berhasil dimulai ulang, harap refresh halaman dalam beberapa detik.');
        } else {
            showAlert('error', 'Gagal Memulai Ulang', 'Terjadi kesalahan saat memulai ulang server.');
        }
    })
    .catch(error => {
        showAlert('error', 'Gagal Terhubung', 'Tidak dapat terhubung ke server. Server mungkin sedang offline.');
    });
}

// Function to generate prompt template with jaksel language style
function generatePromptTemplate(userData, userInput) {
    const jakselWords = [
        "literally", "actually", "which is", "so", "basically", 
        "honestly", "in fact", "like", "I mean", "seriously", 
        "on point", "vibes", "struggling", "chill", "awkward", 
        "slay", "gaslight", "gatekeep", "savage", "spill the tea",
        "mood", "goals", "team", "bestie", "low-key", "high-key",
        "vibe check", "red flag", "sad", "hustle", "worth it",
        "anyway", "btw", "fyi", "omg", "well", "for sure",
        "somehow", "kind of", "is it just me or", "kayanya",
        "I can't even", "IMO", "as expected", "TBH", "lit",
        "obviously", "literally", "actually", "basically", "anyways",
        "make sense", "eventually", "at the end of the day",
        "define banget", "literally gapapa", "somehow", "kayaknya",
        "gak worth it", "kind of", "sesuatu", "lebih prefer",
        "very something", "ya gitulah", "mind-blowing", "epic",
        "that's crazy", "toxic", "wholesome", "ngl", "tbh", 
        "bro-code", "slay queen", "based", "W rizz", "fr fr",
        "it's giving", "iykyk", "lowkey", "thank god", "must try"
    ];
    
    // Get random jaksel words for this prompt
    const getRandomWords = (count) => {
        const result = [];
        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * jakselWords.length);
            result.push(jakselWords[randomIndex]);
        }
        return result;
    };
    
    // Create jaksel prompt template
    const template = `Kamu adalah asisten AI yang WAJIB berbahasa Jaksel (campuran Indonesia-Inggris).

PERSONALITAS:
Friendly (helpful, Gen Z vibes)

ATURAN BAHASA (TIDAK BOLEH DILANGGAR):
1. SEMUA respons HARUS Jaksel (40% English, 60% Indonesian)
2. Gunakan 'gue' dan 'lo' sebagai pronouns
3. Setiap kalimat minimal 2-3 kata bahasa Inggris
4. Filler words yang WAJIB digunakan: ${getRandomWords(5).join(', ')}
5. Indonesian suffixes yang wajib: '-sih', '-banget', '-nya', '-deh'
6. Struktur kalimat: 'So basically...', 'Actually...', 'I mean...', 'Literally...'
7. JANGAN formal Indonesian atau pure English

USER INFO:
${userData ? `- Nama: ${userData.name || 'Unknown'}` : ''}
${userData ? `- Preferensi: ${userData.preferences || 'Unknown'}` : ''}

USER INPUT: ${userInput}

RESPOND with Jaksel style:`;

    return template;
}

// Setup image modal for image preview and zoom
function setupImageModal() {
    // Create modal container if it doesn't exist
    if (!document.querySelector('.image-modal')) {
        const imageModal = document.createElement('div');
        imageModal.className = 'image-modal';
        imageModal.innerHTML = `
            <div class="modal-image-container">
                <img src="" alt="Preview" class="modal-image">
                <button class="close-image-modal">
                    <i class="fas fa-times"></i>
                </button>
                <div class="zoom-controls">
                    <button class="zoom-btn zoom-in">
                        <i class="fas fa-search-plus"></i>
                    </button>
                    <button class="zoom-btn zoom-out">
                        <i class="fas fa-search-minus"></i>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(imageModal);
        
        // Setup event listeners for modal
        const closeBtn = imageModal.querySelector('.close-image-modal');
        const zoomInBtn = imageModal.querySelector('.zoom-in');
        const zoomOutBtn = imageModal.querySelector('.zoom-out');
        const modalImage = imageModal.querySelector('.modal-image');
        
        let currentZoom = 1;
        
        closeBtn.addEventListener('click', () => {
            imageModal.classList.remove('active');
            currentZoom = 1;
            modalImage.style.transform = `scale(${currentZoom})`;
        });
        
        imageModal.addEventListener('click', (e) => {
            if (e.target === imageModal) {
                imageModal.classList.remove('active');
                currentZoom = 1;
                modalImage.style.transform = `scale(${currentZoom})`;
            }
        });
        
        zoomInBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentZoom += 0.25;
            if (currentZoom > 3) currentZoom = 3;
            modalImage.style.transform = `scale(${currentZoom})`;
        });
        
        zoomOutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentZoom -= 0.25;
            if (currentZoom < 0.5) currentZoom = 0.5;
            modalImage.style.transform = `scale(${currentZoom})`;
        });
    }
    
    // Add click event to all message attachments
    document.addEventListener('click', (e) => {
        const attachment = e.target.closest('.message-attachment img');
        if (attachment) {
            const imageModal = document.querySelector('.image-modal');
            const modalImage = imageModal.querySelector('.modal-image');
            
            modalImage.src = attachment.src;
            imageModal.classList.add('active');
        }
    });
} 