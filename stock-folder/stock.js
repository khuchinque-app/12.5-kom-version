// stock.js

// Load stock data and notes on page load
document.addEventListener('DOMContentLoaded', () => {
    loadStockTable();
    loadNotes();
});

// Function to go back to main page
function goBack() {
    window.location.href = '../index.html'; // Adjust path if needed
}

// Function to add a new stock item
function addStockItem() {
    const name = document.getElementById('itemName').value.trim();
    const quantity = parseInt(document.getElementById('itemQuantity').value, 10);
    const unit = document.getElementById('itemUnit').value.trim();
    const threshold = parseInt(document.getElementById('itemThreshold').value, 10);

    if (!name || isNaN(quantity) || !unit || isNaN(threshold)) {
        alert('Please fill in all fields correctly.');
        return;
    }

    const stock = getStockFromStorage();
    stock.push({ name, quantity, unit, threshold });
    saveStockToStorage(stock);
    loadStockTable();

    // Clear inputs
    document.getElementById('itemName').value = '';
    document.getElementById('itemQuantity').value = '';
    document.getElementById('itemUnit').value = '';
    document.getElementById('itemThreshold').value = '';
}

// Function to filter stock table based on search
function filterStock() {
    const searchTerm = document.getElementById('stockSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#stockBody tr');

    rows.forEach(row => {
        const itemName = row.querySelector('td:first-child').textContent.toLowerCase();
        row.style.display = itemName.includes(searchTerm) ? '' : 'none';
    });
}

// Function to export stock report as CSV
function exportStockReport() {
    const stock = getStockFromStorage();
    let csvContent = 'data:text/csv;charset=utf-8,Item,Quantity,Unit,Threshold\n';

    stock.forEach(item => {
        csvContent += `${item.name},${item.quantity},${item.unit},${item.threshold}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'stock_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Helper: Get stock from localStorage
function getStockFromStorage() {
    return JSON.parse(localStorage.getItem('stockItems')) || [];
}

// Helper: Save stock to localStorage
function saveStockToStorage(stock) {
    localStorage.setItem('stockItems', JSON.stringify(stock));
}

// Function to load and render stock table
function loadStockTable() {
    const stock = getStockFromStorage();
    const tbody = document.getElementById('stockBody');
    tbody.innerHTML = '';

    stock.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${item.unit}</td>
            <td>${item.threshold}</td>
            <td>
                <button onclick="editItem(${index})">Edit</button>
                <button onclick="deleteItem(${index})">Delete</button>
            </td>
        `;
        if (item.quantity <= item.threshold) {
            row.classList.add('low-stock');
        }
        tbody.appendChild(row);
    });
}

// Function to edit an item (simple prompt-based for now)
function editItem(index) {
    const stock = getStockFromStorage();
    const item = stock[index];

    const newQuantity = prompt('Edit Quantity:', item.quantity);
    const newThreshold = prompt('Edit Threshold:', item.threshold);

    if (newQuantity !== null && !isNaN(parseInt(newQuantity, 10))) {
        item.quantity = parseInt(newQuantity, 10);
    }
    if (newThreshold !== null && !isNaN(parseInt(newThreshold, 10))) {
        item.threshold = parseInt(newThreshold, 10);
    }

    saveStockToStorage(stock);
    loadStockTable();
}

// Function to delete an item
function deleteItem(index) {
    if (confirm('Are you sure you want to delete this item?')) {
        const stock = getStockFromStorage();
        stock.splice(index, 1);
        saveStockToStorage(stock);
        loadStockTable();
    }
}

// Function to load notes from localStorage
function loadNotes() {
    const notes = localStorage.getItem('stockNotes') || '';
    document.getElementById('stockNotes').value = notes;
}

// Function to save notes to localStorage
function saveNotes() {
    const notes = document.getElementById('stockNotes').value;
    localStorage.setItem('stockNotes', notes);
    alert('Notes saved!');
}
