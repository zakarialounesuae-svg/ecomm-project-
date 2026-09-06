(function () {
  "use strict";

  var WHATSAPP_NUMBER = "213672349013";
  var DELIVERY_PRICE = 500;
  var PRODUCT_NAME = "منظف الأذن الرقمي E80";

  var VARIANT_LABELS = {
    kids: "أطفال",
    adult: "بالغين",
    senior: "كبار السن"
  };

  var variantCards = document.querySelectorAll(".variant-card");
  var qtyInput = document.getElementById("qty");
  var qtyMinusBtn = document.getElementById("qty-minus");
  var qtyPlusBtn = document.getElementById("qty-plus");
  var qtyVariantLabel = document.getElementById("qty-variant-label");

  var summaryVariantName = document.getElementById("summary-variant-name");
  var summaryProductTotal = document.getElementById("summary-product-total");
  var summaryTotal = document.getElementById("summary-total");
  var stickyTotal = document.getElementById("sticky-total");

  var orderForm = document.getElementById("order-form");
  var orderConfirmation = document.getElementById("order-confirmation");

  function getSelectedVariant() {
    var checked = document.querySelector('input[name="variant"]:checked');
    return {
      value: checked ? checked.value : "adult",
      price: checked ? parseInt(checked.getAttribute("data-price"), 10) : 6000
    };
  }

  function getQuantity() {
    var value = parseInt(qtyInput.value, 10);
    if (isNaN(value) || value < 1) value = 1;
    return value;
  }

  function updateVariantCardStyles() {
    variantCards.forEach(function (card) {
      var input = card.querySelector('input[name="variant"]');
      card.classList.toggle("active", input.checked);
    });
  }

  function updateTotals() {
    var variant = getSelectedVariant();
    var qty = getQuantity();
    var productTotal = variant.price * qty;
    var grandTotal = productTotal + DELIVERY_PRICE;
    var label = VARIANT_LABELS[variant.value];

    summaryVariantName.innerHTML = label + " × <span id=\"summary-qty\">" + qty + "</span>";
    summaryProductTotal.textContent = productTotal + " دج";
    summaryTotal.textContent = grandTotal + " دج";
    stickyTotal.textContent = grandTotal + " دج";
    qtyVariantLabel.textContent = "الفئة المختارة: " + label;

    updateVariantCardStyles();
  }

  variantCards.forEach(function (card) {
    var input = card.querySelector('input[name="variant"]');
    input.addEventListener("change", updateTotals);
  });

  qtyMinusBtn.addEventListener("click", function () {
    var qty = getQuantity();
    if (qty > 1) qty -= 1;
    qtyInput.value = qty;
    updateTotals();
  });

  qtyPlusBtn.addEventListener("click", function () {
    var qty = getQuantity();
    if (qty < 20) qty += 1;
    qtyInput.value = qty;
    updateTotals();
  });

  document.getElementById("sticky-cta").addEventListener("click", function (e) {
    e.preventDefault();
    document.getElementById("order").scrollIntoView({ behavior: "smooth" });
    setTimeout(function () {
      document.getElementById("fullname").focus();
    }, 400);
  });

  var REQUIRED_FIELDS = ["fullname", "phone", "wilaya", "commune", "address"];

  function clearFieldError(fieldId) {
    var wrapper = document.getElementById("field-" + fieldId);
    if (wrapper) wrapper.classList.remove("error");
  }

  function setFieldError(fieldId) {
    var wrapper = document.getElementById("field-" + fieldId);
    if (wrapper) wrapper.classList.add("error");
  }

  function isPhoneValid(value) {
    var digits = value.replace(/\D/g, "");
    return digits.length >= 9;
  }

  function validateForm() {
    var valid = true;
    REQUIRED_FIELDS.forEach(function (id) {
      var el = document.getElementById(id);
      var value = el.value.trim();
      clearFieldError(id);

      if (!value) {
        setFieldError(id);
        valid = false;
        return;
      }
      if (id === "phone" && !isPhoneValid(value)) {
        setFieldError(id);
        valid = false;
      }
    });
    return valid;
  }

  REQUIRED_FIELDS.forEach(function (id) {
    document.getElementById(id).addEventListener("input", function () {
      clearFieldError(id);
    });
  });

  function buildWhatsappMessage() {
    var variant = getSelectedVariant();
    var qty = getQuantity();
    var productTotal = variant.price * qty;
    var grandTotal = productTotal + DELIVERY_PRICE;
    var label = VARIANT_LABELS[variant.value];

    var fullname = document.getElementById("fullname").value.trim();
    var phone = document.getElementById("phone").value.trim();
    var wilaya = document.getElementById("wilaya").value.trim();
    var commune = document.getElementById("commune").value.trim();
    var address = document.getElementById("address").value.trim();
    var notes = document.getElementById("notes").value.trim();

    var lines = [
      "مرحبا، بغيت نطلب:",
      "",
      "المنتج: " + PRODUCT_NAME,
      "الفئة: " + label,
      "الكمية: " + qty,
      "السعر: " + variant.price + " دج × " + qty + " = " + productTotal + " دج",
      "التوصيل: " + DELIVERY_PRICE + " دج",
      "المجموع: " + grandTotal + " دج",
      "",
      "معلومات التوصيل:",
      "الاسم الكامل: " + fullname,
      "الهاتف: " + phone,
      "الولاية: " + wilaya,
      "البلدية: " + commune,
      "العنوان: " + address
    ];

    if (notes) {
      lines.push("ملاحظات: " + notes);
    }

    lines.push("", "نستنى تأكيد الطلبية 🙏");

    return lines.join("\n");
  }

  orderForm.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!validateForm()) {
      var firstError = orderForm.querySelector(".field.error input, .field.error textarea");
      if (firstError) {
        firstError.focus();
        firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      orderConfirmation.classList.add("hidden");
      return;
    }

    var message = buildWhatsappMessage();
    var url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
    window.open(url, "_blank", "noopener");

    orderConfirmation.classList.remove("hidden");
    orderConfirmation.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  updateTotals();
})();
