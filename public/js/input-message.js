/**
 * Input Message Component
 * 
 * Komponen untuk input pesan chatbox
 */

const loadInputMessageComponent = async () => {
  // Template komponen
  const template = `
    <div class="chat-input-container">
        <div class="chat-input-wrapper">
            <div id="attachments-container" class="attachments-container">
                <!-- Uploaded files will appear here -->
            </div>
            
            <div class="chat-tools">
                <button id="file-upload-btn" class="tool-btn" aria-label="Upload File">
                    <i class="fas fa-paperclip"></i>
                    <input type="file" id="file-upload" accept="image/*" multiple hidden>
                </button>
                <button id="emoji-picker-btn" class="tool-btn" aria-label="Emoji Picker">
                    <i class="fas fa-smile"></i>
                </button>
            </div>

            <textarea 
                id="message-input" 
                class="message-input" 
                placeholder="Ketik pesan Anda di sini..."
                rows="1"
                aria-label="Message Input"></textarea>

            <button id="send-message-btn" class="send-btn" aria-label="Send Message" disabled>
                <i class="fas fa-paper-plane"></i>
            </button>
        </div>

        <div id="emoji-picker-container" class="emoji-picker-container hidden">
            <!-- Emoji picker will be dynamically populated here -->
        </div>
        
        <div class="input-feedback">
            <p>Tekan <kbd>Enter</kbd> untuk mengirim, <kbd>Shift</kbd>+<kbd>Enter</kbd> untuk baris baru</p>
        </div>
    </div>
  `;

  // Setup komponen dan mengembalikan elemen DOM
  const setupComponent = (container) => {
    // Tambahkan HTML ke container
    container.innerHTML = template;

    // Setup elemen setelah dimuat
    const messageInput = container.querySelector('#message-input');
    const sendButton = container.querySelector('#send-message-btn');
    const emojiPickerBtn = container.querySelector('#emoji-picker-btn');
    const emojiPicker = container.querySelector('#emoji-picker-container');
    const fileUploadBtn = container.querySelector('#file-upload-btn');
    const fileUploadInput = container.querySelector('#file-upload');

    // Emoji yang umum digunakan
    const commonEmojis = [
      '😀', '😄', '🙂', '😊', '😍', '🤔', '🙄', '😮', '😢', '😭',
      '😡', '🥳', '😎', '👍', '👎', '👋', '❤️', '🔥', '⭐', '✅',
      '😂', '🤣', '😅', '😁', '🥰', '😘', '😋', '😜', '😴', '😳',
      '😱', '🤯', '😤', '😠', '🥺', '😇', '🤩', '🤪', '😝', '👏',
      '🙏', '🤝', '💪', '🫶', '💯', '💢', '💥', '💫', '🌟', '💕'
    ];

    // Setup emoji picker
    const setupEmojiPicker = () => {
      const emojiContainer = document.createElement('div');
      emojiContainer.className = 'emoji-grid';
      
      commonEmojis.forEach(emoji => {
        const emojiBtn = document.createElement('button');
        emojiBtn.className = 'emoji-btn';
        emojiBtn.style.fontSize = '24px'; // Perbesar ukuran emoji
        emojiBtn.textContent = emoji;
        emojiBtn.addEventListener('click', () => addEmojiToInput(emoji));
        emojiContainer.appendChild(emojiBtn);
      });
      
      emojiPicker.appendChild(emojiContainer);
    };

    // Menambahkan emoji ke input
    const addEmojiToInput = (emoji) => {
      const start = messageInput.selectionStart;
      const end = messageInput.selectionEnd;
      const text = messageInput.value;
      
      messageInput.value = text.substring(0, start) + emoji + text.substring(end);
      messageInput.selectionStart = messageInput.selectionEnd = start + emoji.length;
      messageInput.focus();
      handleMessageInput();
    };

    // Toggle emoji picker
    const toggleEmojiPicker = () => {
      emojiPicker.classList.toggle('hidden');
      if (!emojiPicker.classList.contains('hidden')) {
        // Fokuskan ke emoji picker agar tidak langsung hilang
        emojiPicker.focus && emojiPicker.focus();
      }
    };

    // Resize otomatis untuk textarea
    const setupAutoResizeTextarea = () => {
      messageInput.setAttribute('style', 'height:' + (messageInput.scrollHeight) + 'px;overflow-y:hidden;');
    };

    // Handler untuk input pesan
    const handleMessageInput = () => {
      sendButton.disabled = !messageInput.value.trim();
    };

    // Handler untuk keydown pesan
    const handleMessageKeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendButton.disabled) {
          // Trigger event khusus untuk komponen luar bisa menangkapnya
          const event = new CustomEvent('message-send', { 
            detail: { message: messageInput.value.trim() }
          });
          container.dispatchEvent(event);
        }
      }
    };

    // Close emoji picker when clicking outside
    const closeEmojiPickerOnClickOutside = (e) => {
      if (!emojiPicker.classList.contains('hidden') &&
          !emojiPicker.contains(e.target) &&
          e.target !== emojiPickerBtn) {
        emojiPicker.classList.add('hidden');
      }
    };

    // Setup event listeners
    messageInput.addEventListener('input', handleMessageInput);
    messageInput.addEventListener('keydown', handleMessageKeydown);
    sendButton.addEventListener('click', () => {
      const event = new CustomEvent('message-send', { 
        detail: { message: messageInput.value.trim() }
      });
      container.dispatchEvent(event);
    });

    fileUploadBtn.addEventListener('click', () => fileUploadInput.click());
    fileUploadInput.addEventListener('change', (e) => {
      const event = new CustomEvent('file-upload', { 
        detail: { files: e.target.files }
      });
      container.dispatchEvent(event);
    });
    
    emojiPickerBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Cegah bubbling agar tidak langsung tertutup
      toggleEmojiPicker();
    });
    document.addEventListener('click', closeEmojiPickerOnClickOutside);

    // Initialize
    setupEmojiPicker();
    setupAutoResizeTextarea();

    // Expose public methods
    return {
      clearInput: () => {
        messageInput.value = '';
        messageInput.style.height = 'auto';
        handleMessageInput();
      },
      focus: () => {
        messageInput.focus();
      }
    };
  };

  return { setupComponent };
};

// Export komponen
if (typeof module !== 'undefined' && module.exports) {
  module.exports = loadInputMessageComponent;
} else {
  window.loadInputMessageComponent = loadInputMessageComponent;
} 