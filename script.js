const PRODUCT_PRICE = 3000;
const SHIPPING_FEE = 500;

const quantitySelect = document.getElementById('quantity');
const summaryQty = document.getElementById('summary-qty');
const summaryProductTotal = document.getElementById('summary-product-total');
const summaryTotal = document.getElementById('summary-total');
const orderForm = document.getElementById('order-form');
const orderConfirmation = document.getElementById('order-confirmation');

function formatDA(amount) {
  return `${amount.toLocaleString('fr-FR')} DA`;
}

function updateSummary() {
  const qty = parseInt(quantitySelect.value, 10) || 1;
  const productTotal = PRODUCT_PRICE * qty;
  const total = productTotal + SHIPPING_FEE;

  summaryQty.textContent = qty;
  summaryProductTotal.textContent = formatDA(productTotal);
  summaryTotal.textContent = formatDA(total);
}

quantitySelect.addEventListener('change', updateSummary);
updateSummary();

orderForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const fullname = document.getElementById('fullname').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const wilaya = document.getElementById('wilaya').value.trim();
  const address = document.getElementById('address').value.trim();

  if (!fullname || !phone || !wilaya || !address) {
    alert('Merci de remplir tous les champs obligatoires (*).');
    return;
  }

  const qty = parseInt(quantitySelect.value, 10) || 1;
  const total = PRODUCT_PRICE * qty + SHIPPING_FEE;

  document.getElementById('conf-name').textContent = fullname;
  document.getElementById('conf-phone').textContent = phone;
  document.getElementById('conf-total').textContent = formatDA(total);

  orderConfirmation.classList.remove('hidden');
  orderForm.reset();
  updateSummary();

  orderConfirmation.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
