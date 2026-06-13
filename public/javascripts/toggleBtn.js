const descriptionCollapse = document.querySelector('#fullDescription');
const descriptionToggleBtn = document.querySelector('#descriptionToggleBtn');

if (descriptionCollapse && descriptionToggleBtn) {
  descriptionCollapse.addEventListener('shown.bs.collapse', function () {
    descriptionToggleBtn.textContent = 'Show less';
  });

  descriptionCollapse.addEventListener('hidden.bs.collapse', function () {
    descriptionToggleBtn.textContent = 'Read more';
  });
}
const moreReviews = document.querySelector('#moreReviews');
const viewMoreBtn = document.querySelector('#viewMoreBtn');

if (moreReviews && viewMoreBtn) {
  moreReviews.addEventListener('shown.bs.collapse', function () {
    viewMoreBtn.textContent = 'Show less reviews';
  });

  moreReviews.addEventListener('hidden.bs.collapse', function () {
    viewMoreBtn.textContent = 'Show all reviews';
  });
}