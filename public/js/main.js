const header = document.getElementById('siteHeader');
const hero = document.getElementById('heroV2');

function handleScrollEffects() {
  const scrollY = window.scrollY;

  if (header) {
    if (scrollY > 24) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  if (hero) {
    const max = 260;
    const progress = Math.min(scrollY / max, 1);

    const contentScale = 1 - progress * 0.12;
    const contentOpacity = 1 - progress * 0.9;
    const contentTranslateY = progress * -24;

    hero.style.setProperty('--hero-scale', contentScale.toFixed(3));
    hero.style.setProperty('--hero-opacity', contentOpacity.toFixed(3));
    hero.style.setProperty('--hero-translate', `${contentTranslateY.toFixed(1)}px`);
  }
}

window.addEventListener('scroll', handleScrollEffects);
window.addEventListener('load', handleScrollEffects);

const thumbButtons = document.querySelectorAll('.thumb-btn');
const mainProductImage = document.getElementById('mainProductImage');

thumbButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const image = btn.dataset.image;
    if (mainProductImage && image) {
      mainProductImage.src = image;
    }
  });
});

const variants = window.productVariants || [];
const colorButtons = document.querySelectorAll('[data-color]');
const sizeButtons = document.querySelectorAll('[data-size]');
const variantIdInput = document.getElementById('variantIdInput');
const selectedVariantBox = document.getElementById('selectedVariantBox');
const addToCartBtn = document.getElementById('addToCartBtn');

let selectedColor = colorButtons.length ? colorButtons[0].dataset.color : null;
let selectedSize = sizeButtons.length ? sizeButtons[0].dataset.size : null;

function updateVariantSelection() {
  if (!variantIdInput || !selectedVariantBox || !addToCartBtn) return;

  const matched = variants.find(
    (variant) => variant.color_name === selectedColor && variant.size_name === selectedSize
  );

  if (matched) {
    variantIdInput.value = matched.id;
    selectedVariantBox.textContent = `${matched.color_name} · ${matched.size_name} · Stock: ${matched.stock}`;
    addToCartBtn.disabled = matched.stock <= 0;
    addToCartBtn.textContent = matched.stock <= 0 ? 'Sin stock' : 'Agregar al carrito';
  } else {
    variantIdInput.value = '';
    selectedVariantBox.textContent = 'Esta combinación no está disponible';
    addToCartBtn.disabled = true;
    addToCartBtn.textContent = 'Sin stock';
  }

  colorButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.color === selectedColor);
  });

  sizeButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.size === selectedSize);

    const exists = variants.some(
      (variant) => variant.color_name === selectedColor && variant.size_name === btn.dataset.size && variant.stock > 0
    );
    btn.classList.toggle('disabled', !exists);
  });
}

colorButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    selectedColor = btn.dataset.color;
    updateVariantSelection();
  });
});

sizeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.classList.contains('disabled')) return;
    selectedSize = btn.dataset.size;
    updateVariantSelection();
  });
});

if (variants.length) {
  updateVariantSelection();
}