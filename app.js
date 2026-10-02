// --- إدارة البيانات وحالة التطبيق ---
const STORAGE_KEY_PRODUCTS = 'warm_invoice_products';
const STORAGE_KEY_SETTINGS = 'warm_invoice_settings';

// كتالوج فارغ جاهز للاستخدام المباشر دون أمثلة تجريبية
let products = JSON.parse(localStorage.getItem(STORAGE_KEY_PRODUCTS)) || [];
let invoiceItems = [];

// عناصر واجهة المستخدم
const companyNameInput = document.getElementById('companyName');
const clientNameInput = document.getElementById('clientName');
const invoiceNumberInput = document.getElementById('invoiceNumber');
const invoiceDateInput = document.getElementById('invoiceDate');

const viewCompany = document.getElementById('viewCompany');
const viewClient = document.getElementById('viewClient');
const viewInvoiceNumber = document.getElementById('viewInvoiceNumber');
const viewDate = document.getElementById('viewDate');

const catalogList = document.getElementById('catalogList');
const newProductForm = document.getElementById('newProductForm');
const invoiceItemsTable = document.getElementById('invoiceItems');

const subtotalEl = document.getElementById('subtotal');
const taxEl = document.getElementById('tax');
const grandTotalEl = document.getElementById('grandTotal');

const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const downloadImgBtn = document.getElementById('downloadImgBtn');

// --- تهيئة التطبيق ---
function init() {
  // ضبط التاريخ الافتراضي لليوم
  const today = new Date().toISOString().split('T')[0];
  invoiceDateInput.value = today;
  viewDate.textContent = today;

  // استرجاع الإعدادات المحفوظة مسبقاً للشركة
  const savedSettings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS));
  if (savedSettings && savedSettings.companyName) {
    companyNameInput.value = savedSettings.companyName;
    viewCompany.textContent = savedSettings.companyName;
  }

  renderCatalog();
  setupEventListeners();
}

// --- أحداث التفاعل (Event Listeners) ---
function setupEventListeners() {
  // تحديث اسم الشركة الفوري وحفظه
  companyNameInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    viewCompany.textContent = val !== '' ? val : 'اسم المتجر / الشركة';
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify({ companyName: val }));
  });

  // تحديث اسم العميل الفوري (فارغ إذا لم يكتب شيئاً)
  clientNameInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    viewClient.textContent = val !== '' ? val : '-';
  });

  // تحديث رقم الفاتورة
  invoiceNumberInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    viewInvoiceNumber.textContent = val !== '' ? val : '-';
  });

  // تحديث التاريخ
  invoiceDateInput.addEventListener('change', (e) => {
    viewDate.textContent = e.target.value || '-';
  });

  // إضافة منتج جديد للكتالوج وحفظه في الذاكرة المحلية
  newProductForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('prodName').value.trim();
    const price = parseFloat(document.getElementById('prodPrice').value);
    const image = document.getElementById('prodImage').value.trim();

    if (!name || isNaN(price)) return;

    const newProd = {
      id: Date.now(),
      name,
      price,
      image
    };

    products.push(newProd);
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
    renderCatalog();
    newProductForm.reset();
  });

  // تنزيل كـ PDF
  downloadPdfBtn.addEventListener('click', () => {
    const filename = viewInvoiceNumber.textContent !== '-' ? viewInvoiceNumber.textContent : 'invoice';
    const element = document.getElementById('invoiceSheet');
    const opt = {
      margin:       10,
      filename:     `${filename}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  });

  // تنزيل كصورة
  downloadImgBtn.addEventListener('click', () => {
    const filename = viewInvoiceNumber.textContent !== '-' ? viewInvoiceNumber.textContent : 'invoice';
    const element = document.getElementById('invoiceSheet');
    html2canvas(element, { scale: 2, useCORS: true }).then((canvas) => {
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  });
}

// --- رسم الكتالوج ---
function renderCatalog() {
  catalogList.innerHTML = '';

  if (products.length === 0) {
    catalogList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 12px;">لا توجد منتجات مضافة بعد. أضف منتجك الأول من النموذج أعلاه.</p>';
    return;
  }

  products.forEach((prod) => {
    const itemCard = document.createElement('div');
    itemCard.className = 'catalog-item';
    
    const imgSrc = prod.image || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60" viewBox="0 0 100 60"><rect width="100%" height="100%" fill="%23e7dfd5"/><text x="50%" y="55%" font-size="12" fill="%238a6d58" text-anchor="middle" font-family="sans-serif">منتج</text></svg>';

    itemCard.innerHTML = `
      <img src="${imgSrc}" alt="${prod.name}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'60\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%23e7dfd5\\'/></svg>'">
      <span class="item-title">${prod.name}</span>
      <span class="item-price">${prod.price.toFixed(2)} ر.س</span>
    `;

    itemCard.addEventListener('click', () => {
      addToInvoice(prod);
    });

    catalogList.appendChild(itemCard);
  });
}

// --- إضافة وتعديل عناصر الفاتورة ---
function addToInvoice(product) {
  const existing = invoiceItems.find((item) => item.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    invoiceItems.push({
      id: product.id,
      name: product.name,
      price: product.price,
      qty: 1
    });
  }
  renderInvoiceTable();
}

function updateQuantity(id, newQty) {
  const item = invoiceItems.find((item) => item.id === id);
  if (item) {
    const qty = parseInt(newQty, 10);
    if (qty <= 0 || isNaN(qty)) {
      removeFromInvoice(id);
    } else {
      item.qty = qty;
      renderInvoiceTable();
    }
  }
}

function removeFromInvoice(id) {
  invoiceItems = invoiceItems.filter((item) => item.id !== id);
  renderInvoiceTable();
}

// --- رسم جدول الفاتورة وحساب الإجماليات ---
function renderInvoiceTable() {
  invoiceItemsTable.innerHTML = '';

  let subtotal = 0;

  invoiceItems.forEach((item) => {
    const itemTotal = item.price * item.qty;
    subtotal += itemTotal;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${item.price.toFixed(2)} ر.س</td>
      <td>
        <input type="number" min="1" class="qty-input" value="${item.qty}" data-id="${item.id}">
      </td>
      <td>${itemTotal.toFixed(2)} ر.س</td>
      <td class="no-print">
        <button class="btn-remove" data-id="${item.id}">حذف</button>
      </td>
    `;

    tr.querySelector('.qty-input').addEventListener('change', (e) => {
      updateQuantity(item.id, e.target.value);
    });

    tr.querySelector('.btn-remove').addEventListener('click', () => {
      removeFromInvoice(item.id);
    });

    invoiceItemsTable.appendChild(tr);
  });

  const tax = subtotal * 0.15;
  const grandTotal = subtotal + tax;

  subtotalEl.textContent = `${subtotal.toFixed(2)} ر.س`;
  taxEl.textContent = `${tax.toFixed(2)} ر.س`;
  grandTotalEl.textContent = `${grandTotal.toFixed(2)} ر.س`;
}

// تشغيل التطبيق عند اكتمال تحميل الصفحة
document.addEventListener('DOMContentLoaded', init);
