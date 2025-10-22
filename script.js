const slides = document.querySelector('.slides');
let currentIndex = 0;

function updateSlides() {
  slides.style.transition = 'none'; // Disable transition
  slides.style.transform = `translateX(-${currentIndex * 100}%)`;
}

// Auto-advance every 1 seconds
setInterval(() => {
  currentIndex = (currentIndex + 1) % slides.children.length;
  updateSlides();
}, 1000);
