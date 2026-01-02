// Mobile menu toggle
const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");

if (hamburger && mobileMenu) {
  hamburger.addEventListener("click", () => {
    mobileMenu.classList.toggle("open");
  });

  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu.classList.remove("open");
    });
  });
}

// Scroll reveal
const revealEls = document.querySelectorAll(".reveal");
const revealOnScroll = () => {
  const trigger = window.innerHeight * 0.85;
  revealEls.forEach((el) => {
    const top = el.getBoundingClientRect().top;
    if (top < trigger) el.classList.add("visible");
  });
};
window.addEventListener("scroll", revealOnScroll);
window.addEventListener("load", revealOnScroll);

// Simple parallax on hero
const parallaxEls = document.querySelectorAll("[data-parallax]");
window.addEventListener("mousemove", (e) => {
  const x = (e.clientX / window.innerWidth - 0.5) * 20;
  const y = (e.clientY / window.innerHeight - 0.5) * 20;
  parallaxEls.forEach((el, idx) => {
    const intensity = idx === 0 ? 1 : 1.4;
    el.style.transform = `translate3d(${x / intensity}px, ${y / intensity}px, 0)`;
  });
});

// Product image hover – red tint / second angle
document.querySelectorAll(".product-image").forEach((img) => {
  img.addEventListener("mouseenter", () => {
    img.dataset.originalBg = img.style.backgroundImage;
    const secondaryClass = img.getAttribute("data-secondary");
    if (secondaryClass) {
      img.classList.add(secondaryClass);
    }
  });
  img.addEventListener("mouseleave", () => {
    const secondaryClass = img.getAttribute("data-secondary");
    if (secondaryClass) {
      img.classList.remove(secondaryClass);
    }
  });
});

// Quick view modal from collection cards
const productModal = document.getElementById("productModal");
const modalClose = document.getElementById("modalClose");
const modalTitle = document.getElementById("modalTitle");
const modalPrice = document.getElementById("modalPrice");
const modalDesc = document.getElementById("modalDesc");
const modalImage = document.getElementById("modalImage");

document
  .querySelectorAll(".collection-card .collection-link[data-open-product]")
  .forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const card = e.currentTarget.closest(".collection-card");
      if (!card || !productModal) return;

      const title = card.dataset.title;
      const price = card.dataset.price;
      const desc = card.dataset.desc;
      const imageClass = card.dataset.imageClass; // coll-max, coll-seedhe...

      if (title) modalTitle.textContent = title;
      if (price) modalPrice.textContent = price;
      if (desc) modalDesc.textContent = desc;

      // reset image classes then add hoodie-specific class
      modalImage.className = "modal-image";
      if (imageClass) modalImage.classList.add(imageClass);

      productModal.classList.add("open");
    });
  });

if (modalClose && productModal) {
  modalClose.addEventListener("click", () => {
    productModal.classList.remove("open");
  });
  productModal.addEventListener("click", (e) => {
    if (e.target === productModal) productModal.classList.remove("open");
  });
}


