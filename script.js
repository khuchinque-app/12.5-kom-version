// ======================
// GLOBAL VARIABLES
// ======================
let currentOrderNo = 0;
let editingId = null;
let imageStore = {};          // Stores image data URLs keyed by history item ID

// Floating preview elements
const floatingPreview = document.getElementById('floatingImagePreview');
const floatingImg = floatingPreview ? floatingPreview.querySelector('img') : null;
const floatingDeleteBtn = document.getElementById('floatingDeleteBtn');
let currentHoverItemId = null;
let hideTimeout = null;

// ======================
// CLOCK & ORDER NUMBER MANAGEMENT
// ======================
function updateTimeAndOrder() {
    const now = new Date();
    document.getElementById('liveDate').innerText = now.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
    });
    document.getElementById('liveTime').innerText = now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const today = now.toDateString();
    if (localStorage.getItem('lastResetDate') !== today) {
        currentOrderNo = 0;
        localStorage.setItem('lastResetDate', today);
        saveOrderNo();
    }

    if (!localStorage.getItem('orderNo')) {
        localStorage.setItem('orderNo', '0');
    }
}

function initializeOrderNumber() {
    if (localStorage.getItem('orderNo')) {
        currentOrderNo = parseInt(localStorage.getItem('orderNo'));
        document.getElementById('displayOrderNo').innerText = String(currentOrderNo).padStart(3, '0');
    }
}

function incrementOrderNo() {
    currentOrderNo++;
    saveOrderNo();
    document.getElementById('displayOrderNo').innerText = String(currentOrderNo).padStart(3, '0');
    return String(currentOrderNo).padStart(3, '0');
}

function saveOrderNo() {
    localStorage.setItem('orderNo', currentOrderNo);
}

function manualResetOrderNo() {
    const input = prompt("Set new Order Number (0 to reset):", currentOrderNo);
    if (input !== null && input.trim() !== "") {
        const num = parseInt(input);
        if (!isNaN(num) && num >= 0) {
            currentOrderNo = num;
            saveOrderNo();
            document.getElementById('displayOrderNo').innerText = String(currentOrderNo).padStart(3, '0');
        }
    }
}

// Initialize clock and order number
setInterval(updateTimeAndOrder, 1000);
updateTimeAndOrder();
initializeOrderNumber();

// ======================
// CALCULATOR FUNCTIONALITY
// ======================
const calcDisplay = document.getElementById('calcDisplay');
let lastResult = '';

function calcAppend(val) {
    calcDisplay.value += val;
    calcDisplay.scrollLeft = calcDisplay.scrollWidth;
}

function calcClear() {
    calcDisplay.value = '';
    lastResult = '';
}

function calcSolve() {
    try {
        const expression = calcDisplay.value;
        const result = eval(expression);
        calcDisplay.value = result;
        lastResult = result.toString();

        const historyDiv = document.getElementById('calcHistory');
        historyDiv.innerHTML = `<div>${expression} = ${result}</div>` + historyDiv.innerHTML;
    } catch {
        calcDisplay.value = lastResult || '';
    }
}

// Keyboard shortcuts for calculator
document.addEventListener('keydown', e => {
    const activeElementId = document.activeElement.id;
    if (['inputBox', 'customerName', 'customerAddress', 'checkerInput'].includes(activeElementId)) return;

    if (/[0-9.+\-*/]/.test(e.key)) calcAppend(e.key);
    if (e.key === 'Enter') calcSolve();
    if (e.key === 'Backspace') calcDisplay.value = calcDisplay.value.slice(0, -1);
    if (e.key === 'Escape') calcClear();
});

// ======================
// NOTEPAD FUNCTIONALITY
// ======================
document.addEventListener('DOMContentLoaded', () => {
    const notepad = document.getElementById('cashier-notepad');
    const totalElement = document.getElementById('notepad-total');

    if (notepad && totalElement) {
        notepad.value = localStorage.getItem('cashierNotes') || '';

        const calculateSum = () => {
            const lines = notepad.value.split('\n');
            let total = 0;
            lines.forEach(line => {
                const trimmed = line.trim();
                const match = trimmed.match(/(\d+)k$/i);
                if (match) {
                    total += parseInt(match[1], 10) * 1000;
                }
            });
            totalElement.textContent = `Total Outstanding: ${total.toLocaleString()} Riel`;
        };

        calculateSum();

        notepad.addEventListener('input', () => {
            localStorage.setItem('cashierNotes', notepad.value);
            calculateSum();
        });
    }
});

// ======================
// DATA PERSISTENCE (extended with images)
// ======================
function saveData() {
    const data = {
        history: document.getElementById('historyContainer').innerHTML,
        thorn: document.getElementById('thornContainer').innerHTML,
        dom: document.getElementById('domContainer').innerHTML,
        pozzal: document.getElementById('pozzalContainer').innerHTML,
        etc: document.getElementById('etcContainer').innerHTML,
        extra: document.getElementById('extraContainer').innerHTML,
        finished: document.getElementById('finishedContainer').innerHTML,
        images: imageStore   // Save the image store
    };
    localStorage.setItem('appData', JSON.stringify(data));
}

function loadData() {
    const data = localStorage.getItem('appData');
    if (data) {
        const parsed = JSON.parse(data);
        document.getElementById('historyContainer').innerHTML = parsed.history || '';
        document.getElementById('thornContainer').innerHTML = parsed.thorn || '';
        document.getElementById('domContainer').innerHTML = parsed.dom || '';
        document.getElementById('pozzalContainer').innerHTML = parsed.pozzal || '';
        document.getElementById('etcContainer').innerHTML = parsed.etc || '';
        document.getElementById('extraContainer').innerHTML = parsed.extra || '';
        document.getElementById('finishedContainer').innerHTML = parsed.finished || '';

        // Restore image store
        if (parsed.images) {
            imageStore = parsed.images;
        } else {
            imageStore = {};
        }

        // Re-attach buttons and events
        document.querySelectorAll('.history-item').forEach(item => {
            updateButtonsForContainer(item);
        });

        reattachEvents();
        updateTotals();
        loadDriverNames();

        // Add 'has-image' class to items that have an image
        document.querySelectorAll('.history-item').forEach(item => {
            const id = item.id.replace('hist-', '');
            if (imageStore[id]) {
                item.classList.add('has-image');
            }
        });
    }
}

function reattachEvents() {
    document.querySelectorAll('.history-item').forEach(item => {
        const id = item.id.replace('hist-', '');

        item.draggable = true;
        item.addEventListener('dragstart', drag);

        item.onclick = (e) => {
            if (!e.target.tagName.match(/BUTTON/i)) {
                restoreBill(id);
            }
        };

        const checkBtn = item.querySelector('.check-btn');
        if (checkBtn) checkBtn.onclick = () => toggleCheck(id);

        const editBtn = item.querySelector('.edit-btn');
        if (editBtn) editBtn.onclick = () => editHistory(id);

        const delBtn = item.querySelector('.del-btn');
        if (delBtn) delBtn.onclick = () => removeHistory(id);

        const archiveBtn = item.querySelector('.archive-btn');
        if (archiveBtn) archiveBtn.onclick = () => toggleArchive(id);

        const moveBtn = item.querySelector('.move-btn');
        if (moveBtn) moveBtn.onclick = () => moveToDelivery(id);

        const finishBtn = item.querySelector('.finish-btn');
        if (finishBtn) finishBtn.onclick = () => moveToFinished(id);

        const splitBtn = item.querySelector('.split-btn');
        if (splitBtn) splitBtn.onclick = () => splitOrder(id);

        // Upload button
        const uploadBtn = item.querySelector('.upload-btn');
        if (uploadBtn) uploadBtn.onclick = (e) => {
            e.stopPropagation();
            showUploadModal(id);
        };
    });

    // Attach hover listeners for image preview
    attachHoverListeners();
}

// Load saved data on startup
loadData();

// ======================
// HOVER PREVIEW FUNCTIONS
// ======================
function attachHoverListeners() {
    document.querySelectorAll('.history-item').forEach(item => {
        item.removeEventListener('mouseenter', onItemMouseEnter);
        item.removeEventListener('mouseleave', onItemMouseLeave);
        item.addEventListener('mouseenter', onItemMouseEnter);
        item.addEventListener('mouseleave', onItemMouseLeave);
    });
}

function onItemMouseEnter(e) {
    const item = e.currentTarget;
    const id = item.id.replace('hist-', '');
    if (imageStore[id]) {
        currentHoverItemId = id;
        floatingImg.src = imageStore[id];
        const rect = item.getBoundingClientRect();
        floatingPreview.style.top = rect.top + 'px';
        floatingPreview.style.left = (rect.right + 10) + 'px';
        floatingPreview.style.display = 'block';
    }
}

function onItemMouseLeave() {
    // Delay hiding to allow moving mouse to preview
    hideTimeout = setTimeout(() => {
        if (!floatingPreview.matches(':hover')) {
            floatingPreview.style.display = 'none';
            currentHoverItemId = null;
        }
    }, 200);
}

// Floating preview hover handling
if (floatingPreview) {
    floatingPreview.addEventListener('mouseenter', () => {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
    });

    floatingPreview.addEventListener('mouseleave', () => {
        floatingPreview.style.display = 'none';
        currentHoverItemId = null;
    });
}

if (floatingDeleteBtn) {
    floatingDeleteBtn.onclick = () => {
        if (currentHoverItemId) {
            deleteImage(currentHoverItemId);
            floatingPreview.style.display = 'none';
        }
    };
}

// ======================
// RECEIPT FUNCTIONS
// ======================
function copyReceipt() {
    const output = document.getElementById('outputBox');
    if (output.style.display === 'none') {
        alert('No receipt to copy!');
        return;
    }
    navigator.clipboard.writeText(output.innerText).then(() => {
        alert('Receipt copied to clipboard!');
    });
}

function processOrder() {
    const raw = document.getElementById('inputBox').value.trim();
    if (!raw) {
        alert("Enter order first!");
        return;
    }

    const name = document.getElementById('customerName').value.trim();
    const addr = document.getElementById('customerAddress').value.trim();
    const notes = document.getElementById('notes').value.trim();

    const lines = raw.split('\n');
    const now = new Date();
    const dateTime = now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }) + ', ' + now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    let total = 0;
    let items = 0;
    let orderNo;

    if (editingId) {
        const item = document.getElementById(`hist-${editingId}`);
        if (!item) return;
        orderNo = item.dataset.orderNo;
    } else {
        orderNo = incrementOrderNo();
    }

    // Build HTML bill
    let billHTML = '';
    billHTML += `<div class="bill-info">*order ${orderNo}</div>`;
    billHTML += `<div class="bill-info">*${dateTime}</div>`;
    billHTML += `<br>`;
    if (name) {
        billHTML += `<div class="bill-line">CUSTOMER: ${name.toUpperCase()}</div>`;
        billHTML += `<br>`;
    }
    if (addr) {
        billHTML += `<div class="bill-line">ADDRESS: ${addr.toUpperCase()}</div>`;
        billHTML += `<br>`;
    }
    if (notes) {
        billHTML += `<div class="bill-line">NOTES: ${notes.toUpperCase()}</div>`;
        billHTML += `<br>`;
    }
    billHTML += `<div class="bill-separator">-----------------------------------</div>`;

    let orderItems = [];
    lines.forEach(line => {
        const l = line.trim();
        if (!l) return;

        if (!l.toLowerCase().includes('total') && !l.toLowerCase().includes('subtotal')) {
            orderItems.push(`<div class="bill-item">- ${l.toUpperCase()}</div>`);
            orderItems.push(`<br>`);
        }

        let qty = 1;
        const startQtyMatch = l.match(/^(\d+)/);
        if (startQtyMatch) {
            qty = parseInt(startQtyMatch[1]);
        } else {
            const endQtyMatch = l.match(/\(\s*(\d+)\s*\)$/);
            if (endQtyMatch) {
                qty = parseInt(endQtyMatch[1]);
            }
        }

        const kMatch = l.match(/(\d+[.,]?\d*)[kK]/);
        const numMatch = l.match(/(\d+[.,]?\d*)$/);
        let price = 0;

        if (kMatch) {
            price = parseFloat(kMatch[1].replace(',', '.')) * 1000;
        } else if (numMatch) {
            price = parseFloat(numMatch[1].replace(',', '.')) * (numMatch[1] < 100 ? 1000 : 1);
        }

        if (price > 0 && !l.toLowerCase().includes('total')) {
            items += qty;
            total += price;
        }
    });

    if (orderItems.length > 0 && orderItems[orderItems.length - 1] === '<br>') {
        orderItems.pop();
    }
    billHTML += orderItems.join('');

    billHTML += `<div class="bill-separator">-----------------------------------</div>`;
    billHTML += `<br>`;
    billHTML += `<div class="bill-summary">* ITEM = ${items} items</div>`;
    billHTML += `<div class="bill-total">* TOTAL : ${total.toLocaleString('id-ID')} / $${(total / 4000).toFixed(2)}$</div>`;

    // Build plain text version for export
    let plainText = '';
    plainText += `*order ${orderNo}\n`;
    plainText += `*${dateTime}\n\n`;
    if (name) plainText += `CUSTOMER: ${name.toUpperCase()}\n\n`;
    if (addr) plainText += `ADDRESS: ${addr.toUpperCase()}\n\n`;
    if (notes) plainText += `NOTES: ${notes.toUpperCase()}\n\n`;
    plainText += `-----------------------------------\n`;
    lines.forEach(line => {
        const l = line.trim();
        if (!l) return;
        if (!l.toLowerCase().includes('total') && !l.toLowerCase().includes('subtotal')) {
            plainText += `- ${l.toUpperCase()}\n\n`;
        }
    });
    plainText += `-----------------------------------\n\n`;
    plainText += `* ITEM = ${items} items\n`;
    plainText += `* TOTAL : ${total.toLocaleString('id-ID')} / $${(total / 4000).toFixed(2)}$\n`;

    document.getElementById('billContent').innerHTML = billHTML;
    document.getElementById('outputBox').style.display = 'block';

    const historyItem = createHistoryItem(orderNo, billHTML, plainText, total, items, name, addr, notes, raw);

    if (editingId) {
        const oldItem = document.getElementById(`hist-${editingId}`);
        if (oldItem) {
            // Transfer image if exists
            if (imageStore[editingId]) {
                const newId = historyItem.id.replace('hist-', '');
                imageStore[newId] = imageStore[editingId];
                delete imageStore[editingId];
                historyItem.classList.add('has-image');
            }
            const parent = oldItem.parentElement;
            parent.replaceChild(historyItem, oldItem);
            editingId = null;
        }
    } else {
        document.getElementById('historyContainer').appendChild(historyItem);
    }

    updateButtonsForContainer(historyItem);
    reattachEvents();

    document.getElementById('inputBox').value = '';
    document.getElementById('customerName').value = '';
    document.getElementById('customerAddress').value = '';
    document.getElementById('notes').value = '';

    saveData();
}

function createHistoryItem(orderNo, htmlContent, plainText, total, items, name, addr, notes, raw) {
    const id = Date.now();
    const item = document.createElement('div');
    item.className = 'history-item';
    item.id = `hist-${id}`;
    item.draggable = true;

    item.dataset.orderNo = orderNo;
    item.dataset.htmlContent = htmlContent;
    item.dataset.plainText = plainText;
    item.dataset.total = total;
    item.dataset.items = items;
    item.dataset.customerName = name || '';
    item.dataset.customerAddress = addr || '';
    item.dataset.notes = notes || '';
    item.dataset.rawInput = raw;

    item.innerHTML = `
        Order ${orderNo} - ${name || 'N/A'}<br>
        Address: ${addr || 'N/A'}<br>
        Notes: ${notes || 'N/A'}<br>
        Total: ${total.toLocaleString('id-ID')}
    `;

    return item;
}

function restoreBill(id) {
    const item = document.getElementById(`hist-${id}`);
    if (!item) return;
    document.getElementById('billContent').innerHTML = item.dataset.htmlContent;
    document.getElementById('outputBox').style.display = 'block';
}

function editHistory(id) {
    const item = document.getElementById(`hist-${id}`);
    if (!item) return;

    editingId = id;
    document.getElementById('inputBox').value = item.dataset.rawInput || '';
    document.getElementById('customerName').value = item.dataset.customerName || '';
    document.getElementById('customerAddress').value = item.dataset.customerAddress || '';
    document.getElementById('notes').value = item.dataset.notes || '';

    alert("Loaded for editing! Make changes and click 'Accept Receipt!' again.");
}

function removeHistory(id) {
    const item = document.getElementById(`hist-${id}`);
    if (item && confirm("Delete this order?")) {
        // Also remove associated image from store
        if (imageStore[id]) {
            delete imageStore[id];
        }
        // Hide preview if this item was being hovered
        if (currentHoverItemId === id) {
            floatingPreview.style.display = 'none';
            currentHoverItemId = null;
        }
        item.remove();
        saveData();
        updateTotals();
    }
}

function toggleCheck(id) {
    const item = document.getElementById(`hist-${id}`);
    if (item) {
        item.classList.toggle('checked');
        saveData();
        updateTotals();
    }
}

function toggleArchive(id) {
    const item = document.getElementById(`hist-${id}`);
    if (item) {
        item.classList.toggle('archived');
        saveData();
        updateTotals();
    }
}

// ======================
// DRAG & DROP
// ======================
const containers = document.querySelectorAll('.sidebar, .driver-panel');
containers.forEach(container => {
    container.addEventListener('dragover', e => e.preventDefault());
    container.addEventListener('drop', drop);
});

function drag(e) {
    e.dataTransfer.setData('text/plain', e.target.id);
}

function drop(e) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const item = document.getElementById(id);

    if (item) {
        const targetContainer = e.target.closest('.driver-panel, #historyContainer, #finishedContainer');
        if (targetContainer && targetContainer !== item.parentElement) {
            targetContainer.appendChild(item);
            updateButtonsForContainer(item);
            saveData();
            updateTotals();
        }
    }
}

// ======================
// ORDER MOVEMENT
// ======================
function moveToDelivery(id) {
    const item = document.getElementById(`hist-${id}`);
    if (!item) return;

    const drivers = ['thornContainer', 'domContainer', 'pozzalContainer', 'etcContainer', 'extraContainer'];
    const choice = prompt(`Enter driver number:\n1: NITH\n2: MEY\n3: THORN\n4: ETC\n5: FOOD READY!`);
    const index = parseInt(choice) - 1;

    if (isNaN(index) || index < 0 || index > 4) {
        alert("Invalid choice!");
        return;
    }

    document.getElementById(drivers[index]).appendChild(item);
    updateButtonsForContainer(item);
    saveData();
}

function moveToFinished(id) {
    const item = document.getElementById(`hist-${id}`);
    if (!item) return;

    document.getElementById('finishedContainer').appendChild(item);
    updateButtonsForContainer(item);
    saveData();
    updateTotals();
}

// ======================
// BUTTON MANAGEMENT (updated with upload button)
// ======================
function updateButtonsForContainer(item) {
    const parentId = item.parentElement.id;
    const id = item.id.replace('hist-', '');

    item.querySelectorAll('button').forEach(btn => btn.remove());

    const delBtn = createButton('del-btn', 'X', 'Delete', () => removeHistory(id));
    const editBtn = createButton('edit-btn', 'E', 'Edit', () => editHistory(id));
    item.appendChild(delBtn);
    item.appendChild(editBtn);

    // Upload button (always shown)
    const uploadBtn = createButton('upload-btn', '📷', 'Upload Image', () => showUploadModal(id));
    item.appendChild(uploadBtn);

    const isDelivery = ['thornContainer', 'domContainer', 'pozzalContainer', 'etcContainer', 'extraContainer'].includes(parentId);

    if (parentId === 'historyContainer') {
        item.appendChild(createButton('check-btn', '✓', 'Check', () => toggleCheck(id)));
        item.appendChild(createButton('archive-btn', 'A', 'Archive (ABA)', () => toggleArchive(id)));
        item.appendChild(createButton('move-btn', 'D', 'Move to Delivery', () => moveToDelivery(id)));
        item.appendChild(createButton('finish-btn', 'F', 'Finish', () => moveToFinished(id)));
        item.appendChild(createButton('split-btn', 'S', 'Split Payment', () => splitOrder(id)));
    } else if (isDelivery) {
        item.appendChild(createButton('check-btn', '✓', 'Check', () => toggleCheck(id)));
        item.appendChild(createButton('archive-btn', 'A', 'Archive (ABA)', () => toggleArchive(id)));
        item.appendChild(createButton('finish-btn', 'F', 'Finish', () => moveToFinished(id)));
        item.appendChild(createButton('split-btn', 'S', 'Split Payment', () => splitOrder(id)));
    } else if (parentId === 'finishedContainer') {
        item.appendChild(createButton('check-btn', '✓', 'Check', () => toggleCheck(id)));
        item.appendChild(createButton('archive-btn', 'A', 'Archive (ABA)', () => toggleArchive(id)));
        item.appendChild(createButton('split-btn', 'S', 'Split Payment', () => splitOrder(id)));
    }
}

function createButton(className, text, title, onClick) {
    const btn = document.createElement('button');
    btn.className = className;
    btn.textContent = text;
    btn.title = title;
    btn.onclick = onClick;

    if (className === 'split-btn') {
        btn.style.position = 'absolute';
        btn.style.top = '5px';
        btn.style.left = '5px';
        btn.style.background = '#f39c12';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.width = '20px';
        btn.style.height = '20px';
        btn.style.borderRadius = '50%';
        btn.style.cursor = 'pointer';
        btn.style.lineHeight = '18px';
        btn.style.textAlign = 'center';
        btn.style.fontSize = '12px';
        btn.style.opacity = '0';
        btn.style.transition = 'opacity 0.2s';
    }

    return btn;
}

// ======================
// IMAGE UPLOAD FUNCTIONALITY
// ======================

// Get modal elements
const uploadModal = document.getElementById('uploadModal');
const modalPasteBtn = document.getElementById('modalPasteBtn');
const modalFileBtn = document.getElementById('modalFileBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const fileInput = document.getElementById('imageUploadInput');

let currentUploadItemId = null; // Store the ID of the item we're uploading for

function showUploadModal(itemId) {
    currentUploadItemId = itemId;
    uploadModal.style.display = 'flex';
}

modalCloseBtn.onclick = () => {
    uploadModal.style.display = 'none';
    currentUploadItemId = null;
};

// Clicking outside modal closes it
window.addEventListener('click', (e) => {
    if (e.target === uploadModal) {
        uploadModal.style.display = 'none';
        currentUploadItemId = null;
    }
});

// Handle paste button
modalPasteBtn.onclick = async () => {
    uploadModal.style.display = 'none';
    if (!currentUploadItemId) return;

    try {
        // Read from clipboard
        const clipboardItems = await navigator.clipboard.read();
        for (let item of clipboardItems) {
            if (item.types.includes('image/png') || item.types.includes('image/jpeg') || item.types.includes('image/jpg')) {
                const blob = await item.getType(item.types.find(type => type.startsWith('image/')));
                const dataUrl = await blobToDataURL(blob);
                saveImageToItem(currentUploadItemId, dataUrl);
                return;
            }
        }
        alert('No image found in clipboard. Please copy an image first (Win+Shift+S).');
    } catch (err) {
        console.error('Clipboard read failed:', err);
        alert('Unable to read clipboard. Please use "Choose File" instead.');
    } finally {
        currentUploadItemId = null;
    }
};

// Handle file selection button
modalFileBtn.onclick = () => {
    uploadModal.style.display = 'none';
    if (!currentUploadItemId) return;

    // Trigger file input
    fileInput.click();
};

// Handle file input change
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPG/PNG).');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        saveImageToItem(currentUploadItemId, event.target.result);
        fileInput.value = ''; // Clear so same file can be chosen again
        currentUploadItemId = null;
    };
    reader.readAsDataURL(file);
});

// Helper: convert blob to data URL
function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Save image to item and store
function saveImageToItem(itemId, dataUrl) {
    const item = document.getElementById(`hist-${itemId}`);
    if (!item) return;

    // Store in imageStore
    imageStore[itemId] = dataUrl;
    item.classList.add('has-image');

    // Save data
    saveData();
}

// Delete image for a given item ID
function deleteImage(itemId) {
    if (!confirm('Remove this image?')) return;

    const item = document.getElementById(`hist-${itemId}`);
    if (item) {
        item.classList.remove('has-image');
    }

    // Remove from store
    if (imageStore[itemId]) {
        delete imageStore[itemId];
    }

    // If currently hovering, hide preview
    if (currentHoverItemId === itemId) {
        floatingPreview.style.display = 'none';
        currentHoverItemId = null;
    }

    saveData();
}

// ======================
// SPLIT ORDER (preserve image for new item)
// ======================
function splitOrder(id) {
    const originalItem = document.getElementById(`hist-${id}`);
    if (!originalItem) return;

    const originalTotal = parseFloat(originalItem.dataset.total) || 0;
    const orderNo = originalItem.dataset.orderNo;

    const abaInput = prompt(
        `Enter ABA amount for Order ${orderNo} (total: ${originalTotal.toLocaleString('id-ID')} Riel):`
    );
    const abaAmount = parseFloat(abaInput);

    if (isNaN(abaAmount) || abaAmount <= 0 || abaAmount > originalTotal) {
        alert("Invalid ABA amount! Must be a number between 1 and the total.");
        return;
    }

    const cashAmount = originalTotal - abaAmount;

    const duplicateId = Date.now();
    const duplicateItem = document.createElement('div');
    duplicateItem.className = 'history-item';
    duplicateItem.id = `hist-${duplicateId}`;
    duplicateItem.draggable = true;

    Object.keys(originalItem.dataset).forEach(key => {
        if (key !== 'total') {
            duplicateItem.dataset[key] = originalItem.dataset[key];
        }
    });
    duplicateItem.dataset.total = abaAmount;
    duplicateItem.classList.add('archived');

    originalItem.dataset.total = cashAmount;

    const updateDisplay = (item, amount, suffix) => {
        let display = item.innerHTML.replace(
            /Total: [\d.,]+/,
            `Total: ${amount.toLocaleString('id-ID')}`
        );
        display = display.replace(
            new RegExp(`Order ${orderNo}`),
            `Order ${orderNo}${suffix}`
        );
        item.innerHTML = display;
    };

    updateDisplay(originalItem, cashAmount, '-CASH');
    updateDisplay(duplicateItem, abaAmount, '-ABA');

    const updateHtmlContent = (item, amount) => {
        let newHtml = item.dataset.htmlContent.replace(
            /(TOTAL: ៛?)[\d.,]+( \/ \$\d+\.\d+)/,
            `$1${amount.toLocaleString('id-ID')}$2`
        );
        newHtml = newHtml.replace(
            /(\* TOTAL : )[\d.,]+( \/ \$\d+\.\d+\$?)/,
            `$1${amount.toLocaleString('id-ID')}$2`
        );
        item.dataset.htmlContent = newHtml;
    };

    updateHtmlContent(originalItem, cashAmount);
    updateHtmlContent(duplicateItem, abaAmount);

    if (originalItem.dataset.plainText) {
        const updatePlainText = (item, amount) => {
            let text = item.dataset.plainText.replace(
                /(\* TOTAL : )[\d.,]+( \/ \$\d+\.\d+\$?)/,
                `$1${amount.toLocaleString('id-ID')}$2`
            );
            item.dataset.plainText = text;
        };
        updatePlainText(originalItem, cashAmount);
        updatePlainText(duplicateItem, abaAmount);
    }

    // Do NOT copy image to split item
    // (original item keeps its image if any)

    originalItem.parentElement.insertBefore(duplicateItem, originalItem.nextSibling);

    updateButtonsForContainer(originalItem);
    updateButtonsForContainer(duplicateItem);
    reattachEvents();

    saveData();
    updateTotals();

    alert("Order split successfully! Edit items in raw input if needed for accurate bill details.");
}

// ======================
// EXPORT & TOTALS (with CHECK column)
// ======================
function exportFinishedOrders() {
    const items = document.querySelectorAll('#finishedContainer .history-item');
    if (items.length === 0) {
        alert("No completed orders!");
        return;
    }

    const date = new Date().toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\//g, '-');

    let summaryTxt = "Customer Name\tAddress\tTotal\tABA\tCHECK\n";
    let detailedTxt = "Customer Name\tAddress\tTotal\tABA\tCHECK\n";
    let unarchived = 0;
    let archived = 0;

    items.forEach(item => {
        const name = item.dataset.customerName || 'N/A';
        const addr = item.dataset.customerAddress || 'N/A';
        const totalMatch = item.innerText.match(/Total: ([\d.,]+)/)?.[1] || '0';
        const aba = item.classList.contains('archived') ? 'ABA' : '';
        const checkStatus = item.classList.contains('checked') ? 'CHECK' : '';

        summaryTxt += `${name}\t${addr}\t${totalMatch}\t${aba}\t${checkStatus}\n`;

        let billText = '';
        if (item.dataset.plainText) {
            billText = item.dataset.plainText;
        } else {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = item.dataset.htmlContent;
            billText = tempDiv.innerText;
        }

        detailedTxt += `${name}\t${addr}\t${totalMatch}\t${aba}\t${checkStatus}\n${billText}\n\n`;

        if (!item.classList.contains('checked')) {
            const totalStr = totalMatch.replace(/\./g, '').replace(/,/g, '.');
            const totalNum = parseFloat(totalStr) || 0;

            if (item.classList.contains('archived')) {
                archived += totalNum;
            } else {
                unarchived += totalNum;
            }
        }
    });

    detailedTxt += `\nGrand Total Cash: ${unarchived.toLocaleString('id-ID')}\n`;
    detailedTxt += `Grand Total ABA: ${archived.toLocaleString('id-ID')}\n`;
    detailedTxt += `Grand Total: ${(unarchived + archived).toLocaleString('id-ID')}\n`;

    const summaryBlob = new Blob([summaryTxt], { type: 'text/plain' });
    const summaryLink = document.createElement('a');
    summaryLink.href = URL.createObjectURL(summaryBlob);
    summaryLink.download = `Completed_Orders_${date}.txt`;
    summaryLink.click();

    const detailedBlob = new Blob([detailedTxt], { type: 'text/plain' });
    const detailedLink = document.createElement('a');
    detailedLink.href = URL.createObjectURL(detailedBlob);
    detailedLink.download = `Completed_Orders_Detailed_${date}.txt`;
    detailedLink.click();

    saveData();
    alert("Downloaded two reports:\n1. Summary (with CHECK column)\n2. Detailed (with CHECK column)");
    updateTotals();
}

function updateTotals() {
    let unarchived = 0;
    let archived = 0;

    document.querySelectorAll('#finishedContainer .history-item').forEach(item => {
        if (item.classList.contains('checked')) return;

        const total = parseFloat(item.dataset.total) || 0;
        if (item.classList.contains('archived')) {
            archived += total;
        } else {
            unarchived += total;
        }
    });

    document.getElementById('totalUnarchived').innerText = unarchived.toLocaleString('id-ID');
    document.getElementById('totalArchived').innerText = archived.toLocaleString('id-ID');
}

// ======================
// PRINT FUNCTIONALITY
// ======================
document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        const outputBox = document.getElementById('outputBox');
        if (outputBox.style.display !== 'none' && outputBox.innerHTML.trim() !== '') {
            window.print();
        } else {
            alert("Nothing to print! Generate a receipt first.");
        }
    }
});

// ======================
// DRIVER NAME MANAGEMENT
// ======================
function loadDriverNames() {
    const drivers = ['thorn', 'dom', 'pozzal', 'etc', 'extra'];
    drivers.forEach(driver => {
        const container = document.getElementById(`${driver}Container`);
        if (container) {
            const header = container.querySelector('h4');
            if (header) {
                const savedName = localStorage.getItem(`driver_name_${driver}`);
                if (savedName) {
                    header.innerText = savedName;
                }
            }
        }
    });
}

function editDriverName(driver) {
    const container = document.getElementById(`${driver}Container`);
    if (!container) return;

    const header = container.querySelector('h4');
    if (!header) return;

    const currentName = header.innerText;
    const newName = prompt("Enter new driver name:", currentName);

    if (newName && newName.trim() !== "") {
        const cleanName = newName.trim().toUpperCase();
        header.innerText = cleanName;
        localStorage.setItem(`driver_name_${driver}`, cleanName);
    }
}

// ======================
// ORDER CHECKER
// ======================
const checkerInput = document.getElementById('checkerInput');
const checkBtn = document.getElementById('checkOrders');
const clearBtn = document.getElementById('clearChecker');
const resultDiv = document.getElementById('checkerResult');

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

clearBtn.onclick = () => {
    checkerInput.innerHTML = '';
    resultDiv.innerText = 'Ready to scan...';
    resultDiv.style.color = 'blue';
};

checkBtn.onclick = () => {
    const raw = checkerInput.innerText.trim();
    if (!raw) return;

    const lines = raw.split('\n');
    let total = 0;
    let itemCount = 0;
    let errorCount = 0;

    const rgxPrice = /(\d+(?:[.,]\d+)?)(\s*)(k|rb)?\b/gi;
    const rgxNote = /^[(-*]|^(note|catatan):/i;
    const rgxHeader = /:\s*$/;

    const highlighted = [];

    lines.forEach(line => {
        const stripped = line.trim();
        if (!stripped) {
            highlighted.push('<br>');
            return;
        }

        if (rgxHeader.test(stripped)) {
            highlighted.push(`<span>${escapeHtml(line)}</span><br>`);
            return;
        }

        if (rgxNote.test(stripped) || stripped.length < 4) {
            highlighted.push(`<span>${escapeHtml(line)}</span><br>`);
            return;
        }

        let match;
        let validPrices = [];
        let malformed = false;
        rgxPrice.lastIndex = 0;

        while ((match = rgxPrice.exec(line)) !== null) {
            const numStr = match[1].replace('.', '').replace(',', '');
            const space = match[2] || '';
            const suffix = match[3] ? match[3].toLowerCase() : '';

            if (suffix && space) {
                malformed = true;
                continue;
            }

            const val = parseFloat(numStr);
            if (!isNaN(val)) {
                let price = val;
                if (suffix) price *= 1000;
                if (price >= 1000) validPrices.push(Math.floor(price));
            }
        }

        if (malformed || validPrices.length !== 1) {
            errorCount++;
            highlighted.push(`<span class="error">${escapeHtml(line)}</span><br>`);
        } else {
            total += validPrices[0];
            itemCount++;
            highlighted.push(`<span class="valid">${escapeHtml(line)}</span><br>`);
        }
    });

    checkerInput.innerHTML = highlighted.join('');
    const resultText = `📦 Items Found: ${itemCount}\n💰 Estimated Total: ${total.toLocaleString('id-ID')}\n⚠️ Missing Prices: ${errorCount} lines (Highlighted in Red)`;
    resultDiv.innerText = resultText;
    resultDiv.style.color = errorCount > 0 ? 'red' : 'green';

    if (errorCount > 0) {
        alert("Missing Prices!\n\nI found lines that look like orders but have:\n- No price\n- Multiple prices\n- Malformed prices (e.g., space between number and 'k')\n\nCheck the RED highlighted lines.");
    }
};

// ======================
// UTILITY FUNCTIONS
// ======================
function goToStock() {
    window.location.href = 'stock-folder/stock.html';
}
