// Core UI Toggles (Defined globally and early)
window.currentUser = null;
window.openProfileSidebar = function() {
  console.log('Opening Profile Sidebar...');
  const sidebar = document.getElementById('profile-sidebar');
  const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
  
  if (!sidebar) return;

  // Update details
  const nameEl = document.getElementById('sidebar-name');
  const emailEl = document.getElementById('sidebar-email');
  const badgeEl = document.getElementById('profile-status-badge');

  if (nameEl) nameEl.innerText = user.name || 'Explorer';
  if (emailEl) emailEl.innerText = user.email || '';
  if (badgeEl) {
    badgeEl.innerText = user.isProfileComplete ? 'Verified' : 'Incomplete';
    badgeEl.className = 'badge ' + (user.isProfileComplete ? 'badge-success' : 'badge-warning');
  }

  sidebar.style.display = 'flex';
  if (typeof feather !== 'undefined') feather.replace();
};

window.showAlert = function(message, type = 'success') {
  const modal = document.getElementById('custom-alert');
  const title = document.getElementById('alert-title');
  const msgText = document.getElementById('alert-message');
  const icon = document.getElementById('alert-icon');
  
  if (!modal || !msgText) return;
  
  title.innerText = type === 'error' ? 'Oops!' : 'Success!';
  msgText.innerText = message;
  
  const iconWrapper = document.getElementById('alert-icon-wrapper');
  if (iconWrapper) {
    if (type === 'error') {
      iconWrapper.style.background = 'rgba(239, 68, 68, 0.1)';
      iconWrapper.style.color = 'var(--color-danger)';
      if (icon) icon.setAttribute('data-feather', 'alert-circle');
    } else {
      iconWrapper.style.background = 'rgba(21, 128, 61, 0.1)';
      iconWrapper.style.color = 'var(--color-success)';
      if (icon) icon.setAttribute('data-feather', 'check-circle');
    }
  }

  modal.style.display = 'flex';
  if (typeof feather !== 'undefined') feather.replace();
};

window.closeAlert = function() {
  const modal = document.getElementById('custom-alert');
  if (modal) modal.style.display = 'none';
};

window.showConfirm = function(options) {
  const modal = document.getElementById('custom-confirm');
  const title = document.getElementById('confirm-title');
  const message = document.getElementById('confirm-message');
  const okBtn = document.getElementById('confirm-ok-btn');
  const cancelBtn = document.getElementById('confirm-cancel-btn');

  if (!modal || !okBtn || !cancelBtn) return;

  title.innerText = options.title || 'Are you sure?';
  message.innerText = options.message || '';
  
  modal.style.display = 'flex';

  const onOk = () => {
    window.closeConfirm();
    if (options.onOk) options.onOk();
  };

  const onCancel = () => {
    window.closeConfirm();
    if (options.onCancel) options.onCancel();
  };

  okBtn.onclick = onOk;
  cancelBtn.onclick = onCancel;
};

window.closeConfirm = function() {
  const modal = document.getElementById('custom-confirm');
  if (modal) modal.style.display = 'none';
};

window.handleAuthError = function(res) {
  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.showAlert('Session expired. Please log in again.', 'warning');
    setTimeout(() => window.location.reload(), 2000);
    return true;
  }
  return false;
};

window.hideAllViews = function() {
  const views = [
    'auth-view', 'home-view', 'my-rides-view', 'history-view', 
    'transactions-view', 'publish-view', 'search-view', 'ride-details-view'
  ];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
};

window.showDashboard = function() {
  window.hideAllViews();
  const homeView = document.getElementById('home-view');
  if (homeView) homeView.style.display = 'block';
  
  // Refresh data
  renderRecentRides();
  
  // Reset nav links
  const navLinks = document.querySelectorAll('.nav-links a');
  navLinks.forEach((l, i) => {
    if (i === 0) l.classList.add('active');
    else l.classList.remove('active');
  });
};

window.triggerSOS = function(rideId) {
  window.showConfirm({
    title: 'EMERGENCY SOS',
    message: 'Are you in danger? Clicking confirm will alert authorities and the ride participants.',
    onOk: async () => {
      try {
        const res = await fetch(`/api/rides/${rideId}/sos`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });

        if (res.ok) {
          window.showAlert('Emergency services and participants alerted!', 'error');
        } else {
          const err = await res.json();
          window.showAlert(err.error || 'Failed to trigger SOS', 'error');
        }
      } catch (err) {
        window.showAlert('Network error. Please try again.', 'error');
      }
    }
  });
};

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
  setupTheme();
  setupAuth();
  setupInteractions();
  setupPublishWorkflow();
  setupSearchWorkflow();
  
  checkAuth();
});

const publishState = {
  checkpoints: [],
  specifications: [],
  seats: 3
};

async function renderRecentRides() {
  const ridesList = document.getElementById('rides-list');
  if (!ridesList) return;

  ridesList.innerHTML = '<div style="text-align: center; padding: 2rem;"><i data-feather="loader" class="spin"></i> Loading rides...</div>';
  if (typeof feather !== 'undefined') feather.replace();

  try {
    const res = await fetch('/api/rides', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
    });

    if (window.handleAuthError(res)) return;

    const rides = await res.json();
    
    if (!res.ok || rides.length === 0) {
      ridesList.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--color-text-muted);">No active rides found. Build the community and publish one!</div>';
      return;
    }

    ridesList.innerHTML = '';
    rides.forEach(ride => {
      const rideEl = document.createElement('div');
      rideEl.className = 'ride-item';
      rideEl.style.cursor = 'pointer';
      
      const dateObj = new Date(ride.departureTime);
      const departureTime = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      const departureDate = dateObj.toLocaleDateString();

      rideEl.innerHTML = `
        <div class="ride-info">
          <div class="icon-wrapper take-icon" style="background-color: ${ride.isEmergency ? 'var(--color-danger)' : 'var(--color-bg)'}; width: 3rem; height: 3rem; color: ${ride.isEmergency ? '#fff' : 'inherit'}">
            <i data-feather="${ride.isEmergency ? 'alert-triangle' : 'map-pin'}"></i>
          </div>
          <div class="ride-route">
            <div class="route-points">
              <span>${ride.fromLocation}</span>
              <i data-feather="arrow-right" class="route-arrow"></i>
              <span>${ride.toLocation}</span>
              ${ride.isEmergency ? '<span class="badge badge-danger" style="background: var(--color-danger); color: #fff; margin-left: 0.5rem; font-size: 0.7rem; padding: 2px 6px;">EMERGENCY</span>' : ''}
            </div>
            <div class="ride-meta">
              <span class="meta-item"><i data-feather="calendar"></i> ${departureDate}, ${departureTime}</span>
              <span class="meta-item"><i data-feather="user"></i> ${ride.host?.name || 'Unknown'}</span>
              <span class="meta-item" style="color: ${ride.capacity === 0 ? 'var(--color-danger)' : 'inherit'}; font-weight: ${ride.capacity === 0 ? '700' : 'normal'}">
                <i data-feather="users"></i> ${ride.capacity === 0 ? 'FULL' : `${ride.capacity} seats`}
              </span>
            </div>
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 1.5rem; align-items: center;">
          <span class="price" style="font-weight: 700; font-size: 1.1rem; color: var(--color-primary);">₹${ride.price}</span>
        </div>
      `;

      rideEl.addEventListener('click', () => window.showRideDetails(ride));
      ridesList.appendChild(rideEl);
    });

    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  } catch (err) {
    console.error('Fetch Rides Error:', err);
    ridesList.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--color-danger);"><i data-feather="alert-circle"></i> Failed to load rides. Please check your connection.</div>';
    if (typeof feather !== 'undefined') feather.replace();
  }
}

function setupInteractions() {
  const takeRideBtn = document.querySelector('#take-ride-card button');
  const offerRideBtn = document.querySelector('#offer-ride-card button');

  if (takeRideBtn) {
    // Logic now handled in setupSearchWorkflow to avoid double-firing
  }

  if (offerRideBtn) {
    // Logic now handled in setupPublishWorkflow to avoid double-firing
  }

  // Navbar interactions
  const navLinks = document.querySelectorAll('.nav-links a');
  navLinks.forEach((link, index) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      if (index === 0) window.showDashboard();
      else if (index === 1) window.showMyRides();
      else if (index === 2) window.showHistory();
      else if (index === 3) window.showWallet();
    });
  });

  const logoLink = document.querySelector('.logo');
  if (logoLink) {
    logoLink.style.cursor = 'pointer';
    logoLink.addEventListener('click', () => {
      navLinks.forEach(l => l.classList.remove('active'));
      if(navLinks[0]) navLinks[0].classList.add('active');
      window.showDashboard();
    });
  }

  // Profile Sidebar toggling
  const profileTrigger = document.getElementById('profile-trigger');
  if (profileTrigger) {
    profileTrigger.addEventListener('click', () => window.openProfileSidebar());
  }

  const btnLogoutSidebar = document.getElementById('btn-logout-sidebar');
  if (btnLogoutSidebar) {
    btnLogoutSidebar.addEventListener('click', () => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.reload();
    });
  }

  // Profile Form Handling
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = profileForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerText;
      
      submitBtn.disabled = true;
      submitBtn.innerText = 'Saving...';

      const data = {
        name: document.getElementById('p-name').value,
        phone: document.getElementById('p-phone').value,
        address: document.getElementById('p-address').value,
        dob: document.getElementById('p-dob').value,
        occupation: document.getElementById('p-occupation').value,
        aadhaar: document.getElementById('p-aadhaar').value
      };

      try {
        const res = await fetch('/api/users/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify(data)
        });

        if (window.handleAuthError(res)) return;

        if (res.ok) {
          const result = await res.json();
          // Update local user state
          localStorage.setItem('auth_user', JSON.stringify(result.user));
          window.closeProfileModal();
          window.showAlert('Profile completed successfully!', 'success');
          window.checkAuth(); 
        } else {
          const err = await res.json();
          window.showAlert(err.error || 'Failed to update profile', 'error');
        }
      } catch (err) {
        window.showAlert('Server error saving profile', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
      }
    });
  }

function checkAuth() {
  const token = localStorage.getItem('auth_token');
  const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
  const authView = document.getElementById('auth-view');
  const homeView = document.getElementById('home-view');
  const mainDashboard = document.querySelector('.main-dashboard');
  const userProfile = document.querySelector('.user-profile');
  const profileWarning = document.getElementById('profile-warning');

  // Always keep main-dashboard visible (auth-view is inside it)
  if (mainDashboard) mainDashboard.style.display = 'block';

  if (!token) {
    if (authView) authView.style.display = 'block';
    if (homeView) homeView.style.display = 'none';
    if (userProfile) userProfile.style.display = 'none';
    if (profileWarning) profileWarning.style.display = 'none';
    window.currentUser = null;
  } else {
    window.currentUser = user;
    if (authView) authView.style.display = 'none';
    if (homeView) homeView.style.display = 'block';
    if (userProfile) userProfile.style.display = 'flex';
    
    // Update profile info
    const sidebarName = document.getElementById('sidebar-name');
    const sidebarEmail = document.getElementById('sidebar-email');
    const profileBadge = document.getElementById('profile-status-badge');
    
    if (sidebarName) sidebarName.innerText = user.name || 'Explorer';
    if (sidebarEmail) sidebarEmail.innerText = user.email || '';
    if (profileBadge) {
      profileBadge.innerText = user.isProfileComplete ? 'Verified' : 'Incomplete';
      profileBadge.className = 'badge ' + (user.isProfileComplete ? 'badge-success' : 'badge-warning');
    }
    
    // Handle profile completion notification
    const profileDot = document.getElementById('profile-dot');
    if (profileWarning) {
      if (user.isProfileComplete) {
        profileWarning.style.display = 'none';
        if (profileDot) profileDot.style.display = 'none';
      } else {
        profileWarning.style.display = 'block'; 
        if (profileDot) profileDot.style.display = 'block';
      }
    }

    // Refresh data
    if (window.showDashboard) window.showDashboard();
  }
}
window.checkAuth = checkAuth;

// Activity Guards
window.requireProfile = function() {
  const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
  if (!user.isProfileComplete) {
    window.showAlert('Please complete your profile to continue.', 'warning');
    window.openProfileModal();
    return false;
  }
  return true;
};

  const btnBook = document.querySelector('#btn-book');
  if (btnBook) {
    btnBook.addEventListener('click', () => {
      if (!window.currentViewRideId) return;
      if (!window.requireProfile()) return;
      window.openBookingModal();
    });
  }

  const confirmBookingBtn = document.getElementById('confirm-booking-btn');
  if (confirmBookingBtn) {
    confirmBookingBtn.addEventListener('click', async () => {
      const seatsRequested = parseInt(document.getElementById('booking-seats-count').innerText);
      const pickupLocation = document.getElementById('booking-pickup').value.trim();
      
      if (!pickupLocation) {
        window.showAlert('Please specify where you would like to be picked up.', 'error');
        return;
      }

      const originalHtml = confirmBookingBtn.innerHTML;
      confirmBookingBtn.disabled = true;
      confirmBookingBtn.innerHTML = 'Requesting... <i data-feather="loader" class="spin"></i>';
      if (typeof feather !== 'undefined') feather.replace();

      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({ 
            rideId: window.currentViewRideId,
            seatsRequested,
            pickupLocation
          })
        });
        
        if (window.handleAuthError(res)) return;

        if (res.ok) {
          window.closeBookingModal();
          window.showAlert('Booking Request Sent to Driver!', 'success');
        } else {
          const data = await res.json();
          window.showAlert(data.error || "Failed to book ride", 'error');
        }
      } catch (err) {
        window.showAlert("Server error connecting to backend.", 'error');
      } finally {
        confirmBookingBtn.disabled = false;
        confirmBookingBtn.innerHTML = originalHtml;
        if (typeof feather !== 'undefined') feather.replace();
      }
    });
  }
}

function setupTheme() {
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (!themeToggleBtn) return;

  // Check for saved theme preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeToggleBtn.innerHTML = '<i data-feather="sun"></i>';
  }

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      themeToggleBtn.innerHTML = '<i data-feather="moon"></i>';
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      themeToggleBtn.innerHTML = '<i data-feather="sun"></i>';
    }
    feather.replace();
  });
}

function setupPublishWorkflow() {
  const homeView = document.getElementById('home-view');
  const publishView = document.getElementById('publish-view');
  const offerRideBtn = document.querySelector('#offer-ride-card button');
  const backBtn = document.getElementById('back-to-dashboard');
  const cancelBtn = document.getElementById('cancel-publish');
  
  // Navigation
  function showPublishForm() {
    window.hideAllViews();
    publishView.style.display = 'block';
    window.scrollTo(0, 0);
  }

  function hidePublishForm() {
    window.showDashboard();
  }

  if (offerRideBtn) offerRideBtn.addEventListener('click', () => {
    if (window.requireProfile()) showPublishForm();
  });
  if (backBtn) backBtn.addEventListener('click', hidePublishForm);
  if (cancelBtn) cancelBtn.addEventListener('click', hidePublishForm);

  // Stepper logic
  const decreaseSeats = document.getElementById('decrease-seats');
  const increaseSeats = document.getElementById('increase-seats');
  const seatCount = document.getElementById('seat-count');

  if (decreaseSeats) decreaseSeats.addEventListener('click', () => {
    if (publishState.seats > 1) {
      publishState.seats--;
      seatCount.innerText = publishState.seats;
    }
  });

  if (increaseSeats) increaseSeats.addEventListener('click', () => {
    if (publishState.seats < 8) {
      publishState.seats++;
      seatCount.innerText = publishState.seats;
    }
  });

  // Checkpoints logic
  const addCheckpointBtn = document.getElementById('add-checkpoint-btn');
  const checkpointsContainer = document.getElementById('checkpoints-container');

  function renderCheckpoints() {
    checkpointsContainer.innerHTML = '';
    publishState.checkpoints.forEach((cp, index) => {
      const div = document.createElement('div');
      div.className = 'input-group mt-3';
      div.innerHTML = `
        <label>Stop ${index + 1}</label>
        <div class="input-with-icon" style="display:flex; gap:0.5rem; align-items:center;">
          <div style="position:relative; flex:1; display:flex; align-items:center;">
            <i data-feather="more-vertical" style="color: var(--color-text-muted); width: 1rem; height: 1rem; position:absolute; left:1rem;"></i>
            <input type="text" value="${cp}" data-index="${index}" class="checkpoint-input" placeholder="Stop location" style="width:100%; padding-left: 2.75rem;">
          </div>
          <button type="button" class="btn-icon remove-checkpoint" data-index="${index}" style="color:var(--color-danger); flex-shrink:0;">
            <i data-feather="x"></i>
          </button>
        </div>
      `;
      checkpointsContainer.appendChild(div);
    });
    
    document.querySelectorAll('.checkpoint-input').forEach(input => {
      input.addEventListener('change', (e) => {
        publishState.checkpoints[e.target.dataset.index] = e.target.value;
      });
    });

    document.querySelectorAll('.remove-checkpoint').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.dataset.index;
        publishState.checkpoints.splice(idx, 1);
        renderCheckpoints();
      });
    });

    if(typeof feather !== 'undefined') feather.replace();
  }

  if (addCheckpointBtn) {
    addCheckpointBtn.addEventListener('click', () => {
      publishState.checkpoints.push('');
      renderCheckpoints();
    });
  }

  // Specifications Logic
  const specInput = document.getElementById('spec-input');
  const specsContainer = document.getElementById('specs-container');

  function renderSpecs() {
    specsContainer.innerHTML = '';
    publishState.specifications.forEach((spec, index) => {
      const chip = document.createElement('div');
      chip.className = 'spec-chip';
      chip.innerHTML = `
        ${spec}
        <button type="button" class="remove-spec" data-index="${index}"><i data-feather="x" style="width:14px;height:14px;"></i></button>
      `;
      specsContainer.appendChild(chip);
    });

    document.querySelectorAll('.remove-spec').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.dataset.index;
        publishState.specifications.splice(idx, 1);
        renderSpecs();
      });
    });

    if(typeof feather !== 'undefined') feather.replace();
  }

  if (specInput) {
    specInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = specInput.value.trim();
        if (val && !publishState.specifications.includes(val)) {
          publishState.specifications.push(val);
          specInput.value = '';
          renderSpecs();
        }
      }
    });
  }

  // Form Submission
  const publishForm = document.getElementById('publish-ride-form');
  if (publishForm) {
    publishForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!window.requireProfile()) return;

      const submitBtn = document.getElementById('publish-submit-btn');
      if (!submitBtn) {
        console.error('Submit button not found');
        return;
      }
      const originalHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Publishing... <i data-feather="loader" class="spin"></i>';
      feather.replace();

      const fromLocation = document.getElementById('route-from').value;
      const toLocation = document.getElementById('route-to').value;
      const departureTime = document.getElementById('ride-datetime').value;
      const price = document.getElementById('ride-price').value;
      
      const payload = {
        fromLocation,
        toLocation,
        departureTime,
        price,
        capacity: publishState.seats,
        checkpoints: publishState.checkpoints.filter(c => c.trim() !== ''),
        specifications: publishState.specifications
      };

      try {
        const res = await fetch('/api/rides', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
          },
          body: JSON.stringify(payload)
        });

        if (window.handleAuthError(res)) return;

        if (res.ok) {
          window.showAlert("Ride published successfully!", "success");
          publishForm.reset();
          publishState.checkpoints = [];
          publishState.specifications = [];
          publishState.seats = 3;
          
          const seatCountEl = document.getElementById('seat-count');
          if (seatCountEl) seatCountEl.innerText = '3';
          
          // Re-render empty states
          const cpContainer = document.getElementById('checkpoints-container');
          const specContainer = document.getElementById('specs-container');
          if (cpContainer) cpContainer.innerHTML = '';
          if (specContainer) specContainer.innerHTML = '';
          
          hidePublishForm();
        } else {
          const data = await res.json();
          window.showAlert(data.error || "Failed to publish ride", "error");
        }
      } catch (err) {
        window.showAlert("Server error connecting to backend.", "error");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalHtml;
        }
        feather.replace();
      }
    });
  }
}

function setupSearchWorkflow() {
  const homeView = document.getElementById('home-view');
  const searchView = document.getElementById('search-view');
  const detailsView = document.getElementById('ride-details-view');
  
  const takeRideBtn = document.querySelector('#take-ride-card button');
  const backFromSearch = document.getElementById('back-from-search');
  const backFromDetails = document.getElementById('back-from-details');
  const searchBtn = document.getElementById('search-btn');

  // Navigations
  window.showSearch = async function() {
    window.hideAllViews();
    searchView.style.display = 'block';
    window.scrollTo(0, 0);
    
    // Auto-load all rides when 'View All' or 'Search' is first opened
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) searchBtn.click(); 
  }

  function hideSearch() {
    window.showDashboard();
  }

  if (takeRideBtn) {
    // Override old setupInteractions listener
    const newTakeRideBtn = takeRideBtn.cloneNode(true);
    takeRideBtn.parentNode.replaceChild(newTakeRideBtn, takeRideBtn);
    newTakeRideBtn.addEventListener('click', window.showSearch);
  }

  if (backFromSearch) backFromSearch.addEventListener('click', hideSearch);
  if (backFromDetails) backFromDetails.addEventListener('click', showSearch);

  // Search Logic
  if (searchBtn) {
    searchBtn.addEventListener('click', async () => {
      const fromQ = document.getElementById('search-from').value.toLowerCase().trim();
      const toQ = document.getElementById('search-to').value.toLowerCase().trim();
      
      const originalText = searchBtn.innerHTML;
      searchBtn.disabled = true;
      searchBtn.innerHTML = '<i data-feather="loader" class="spin"></i>';
      if(typeof feather !== 'undefined') feather.replace();

      try {
        const res = await fetch('/api/rides', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        
        if (!res.ok) {
           const errData = await res.json().catch(() => ({}));
           throw new Error(errData.error || `Server responded with ${res.status}`);
        }

        const rides = await res.json();
        if (!Array.isArray(rides)) throw new Error('Invalid data format from server');

        let results = rides;
        
        if (fromQ || toQ) {
          results = rides.filter(ride => {
            const routeStops = [(ride.fromLocation || '').toLowerCase(), ...(ride.checkpoints || []).map(cp => cp.toLowerCase()), (ride.toLocation || '').toLowerCase()];
            
            let fromIndex = fromQ ? routeStops.findIndex(stop => stop?.includes(fromQ)) : 0;
            let toIndex = toQ ? routeStops.findIndex((stop, idx) => stop?.includes(toQ) && (fromQ ? idx > fromIndex : true)) : routeStops.length - 1;

            return fromIndex !== -1 && toIndex !== -1 && (fromQ ? toIndex > fromIndex : true);
          });
        }

        renderSearchResults(results);
      } catch(err) {
        console.error('Search Error:', err);
        window.showAlert(`Search failed: ${err.message}`, "error");
      } finally {
        searchBtn.disabled = false;
        searchBtn.innerHTML = originalText;
        if(typeof feather !== 'undefined') feather.replace();
      }
    });
  }

  function renderSearchResults(results) {
    const list = document.getElementById('search-results-list');
    const count = document.getElementById('search-results-count');
    
    count.innerText = `${results.length} rides found`;
    list.innerHTML = '';

    if (results.length === 0) {
      list.innerHTML = `<div class="text-muted" style="padding: 2rem; text-align: center;">No rides found for this route.</div>`;
      return;
    }

    results.forEach(ride => {
      const rideEl = document.createElement('div');
      rideEl.className = 'ride-item';
      rideEl.style.cursor = 'pointer';
      
      const dateObj = new Date(ride.departureTime);
      const departureTime = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      const departureDate = dateObj.toLocaleDateString();

      rideEl.innerHTML = `
        <div class="ride-info">
          <div class="icon-wrapper take-icon" style="background-color: var(--color-bg); width: 3rem; height: 3rem;">
            <i data-feather="map-pin"></i>
          </div>
          <div class="ride-route">
            <div class="route-points">
              <span>${ride.fromLocation}</span>
              <i data-feather="arrow-right" class="route-arrow"></i>
              <span>${ride.toLocation}</span>
            </div>
            <div class="ride-meta">
              <span class="meta-item"><i data-feather="calendar"></i> ${departureDate}, ${departureTime}</span>
              <span class="meta-item"><i data-feather="user"></i> ${ride.host?.name || 'Unknown'}</span>
              <span class="meta-item"><i data-feather="users"></i> ${ride.capacity} seats</span>
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 1.5rem; align-items: center;">
          <span class="price" style="font-weight: 700; font-size: 1.1rem; color: var(--color-primary);">₹${ride.price}</span>
        </div>
      `;

      rideEl.addEventListener('click', () => window.showRideDetails(ride));
      list.appendChild(rideEl);
    });

    if(typeof feather !== 'undefined') feather.replace();
  }
}

// Navigation setup (relying on centralized setupInteractions)

let isRegistering = false;

function setupAuth() {
  const authToggleBtn = document.getElementById('auth-toggle-btn');
  const authToggleText = document.getElementById('auth-toggle-text');
  const authTitle = document.getElementById('auth-title');
  const authSubtitle = document.getElementById('auth-subtitle');
  const authNameGroup = document.getElementById('name-group');
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const authForm = document.getElementById('auth-form');

  if (authToggleBtn) {
    authToggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      isRegistering = !isRegistering;
      
      if (isRegistering) {
        authTitle.innerText = "Create an Account";
        authSubtitle.innerText = "Join the Himalayan carpooling community.";
        authNameGroup.style.display = 'block';
        document.getElementById('auth-name').setAttribute('required', 'true');
        authSubmitBtn.innerHTML = 'Sign Up <i data-feather="user-plus"></i>';
        authToggleText.innerText = "Already have an account?";
        authToggleBtn.innerText = "Login";
      } else {
        authTitle.innerText = "Welcome Back";
        authSubtitle.innerText = "Sign in to continue your journey.";
        authNameGroup.style.display = 'none';
        document.getElementById('auth-name').removeAttribute('required');
        authSubmitBtn.innerHTML = 'Login <i data-feather="log-in"></i>';
        authToggleText.innerText = "Don't have an account?";
        authToggleBtn.innerText = "Sign Up";
      }
      feather.replace();
    });
  }

  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;
      const name = document.getElementById('auth-name').value;
      
      authSubmitBtn.disabled = true;
      authSubmitBtn.innerHTML = '<i data-feather="loader" class="spin"></i>';
      feather.replace();

      try {
        const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
        const body = isRegistering ? { name, email, password } : { email, password };
        
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        const data = await res.json();

        if (res.ok) {
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('auth_user', JSON.stringify(data.user));
          checkAuth();
        } else {
          window.showAlert(data.error || "Authentication failed", "error");
        }
      } catch (err) {
        window.showAlert("Server error. Ensure the backend is running.", "error");
      } finally {
        authSubmitBtn.disabled = false;
        authSubmitBtn.innerHTML = isRegistering ? 'Sign Up <i data-feather="user-plus"></i>' : 'Login <i data-feather="log-in"></i>';
        feather.replace();
      }
    });
  }
}

// Global Navigations
window.hideAllViews = function() {
  const views = ['home-view', 'search-view', 'ride-details-view', 'publish-view', 'my-rides-view', 'history-view', 'transactions-view'];
  views.forEach(v => {
    const el = document.getElementById(v);
    if(el) el.style.display = 'none';
  });
};

window.showDashboard = function() {
  window.hideAllViews();
  const el = document.getElementById('home-view');
  if (el) el.style.display = 'block';
  window.scrollTo(0, 0);
  if (typeof renderRecentRides === 'function') renderRecentRides();
};

window.showConfirm = function(options) {
  const modal = document.getElementById('custom-confirm');
  const title = document.getElementById('confirm-title');
  const message = document.getElementById('confirm-message');
  const okBtn = document.getElementById('confirm-ok-btn');
  const cancelBtn = document.getElementById('confirm-cancel-btn');

  if (!modal || !okBtn || !cancelBtn) return;

  title.innerText = options.title || 'Are you sure?';
  message.innerText = options.message || '';
  
  modal.style.display = 'flex';

  const onOk = () => {
    window.closeConfirm();
    if (options.onOk) options.onOk();
  };

  const onCancel = () => {
    window.closeConfirm();
    if (options.onCancel) options.onCancel();
  };

  // Use { once: true } to prevent multiple listeners
  okBtn.onclick = onOk;
  cancelBtn.onclick = onCancel;
};

window.closeConfirm = function() {
  const modal = document.getElementById('custom-confirm');
  if (modal) modal.style.display = 'none';
};

window.endRide = function(rideId) {
  window.showConfirm({
    title: 'End Ride?',
    message: 'Are you sure you want to end this ride? It will be moved to history.',
    onOk: async () => {
      try {
        const res = await fetch(`/api/rides/${rideId}/end`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });

        if (res.ok) {
          window.showAlert('Ride ended and moved to history!', 'success');
          window.showMyRides();
        } else {
          const err = await res.json();
          window.showAlert(err.error || 'Failed to end ride', 'error');
        }
      } catch (err) {
        window.showAlert('Network error. Please check your connection.', 'error');
      }
    }
  });
};

window.showMyRides = async function(activeTab = 'hosting') {
  window.hideAllViews();
  const view = document.getElementById('my-rides-view');
  view.style.display = 'block';
  window.scrollTo(0, 0);

  // Initialize tabs if not already set correctly
  window.switchMyRidesTab(activeTab);
};

window.switchMyRidesTab = async function(tab) {
  const isHosting = tab === 'hosting';
  const hostingContent = document.getElementById('my-rides-hosting-content');
  const joinedContent = document.getElementById('my-rides-joined-content');
  const hostContainer = document.getElementById('host-rides-container');
  const passengerContainer = document.getElementById('passenger-rides-container');
  const tabs = document.querySelectorAll('#my-rides-view .tab-btn');

  // Update Tab Buttons
  tabs.forEach(btn => {
    if ((isHosting && btn.innerText.includes('Hosting')) || (!isHosting && btn.innerText.includes('Joined'))) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Toggle Visibility
  hostingContent.style.display = isHosting ? 'block' : 'none';
  joinedContent.style.display = isHosting ? 'none' : 'block';

  if (isHosting) renderHostingRides();
  else renderJoinedRequests();
};

async function renderHostingRides() {
  const container = document.getElementById('host-rides-container');
  container.innerHTML = '<div style="text-align: center; padding: 2rem; grid-column: 1/-1;"><i data-feather="loader" class="spin"></i> Loading...</div>';
  feather.replace();

  try {
    const ridesRes = await fetch('/api/rides', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
    });
    let allRides = await ridesRes.json();
    if (!Array.isArray(allRides)) allRides = [];

    const userObj = window.currentUser || JSON.parse(localStorage.getItem('auth_user') || '{}');
    const myActiveRides = allRides.filter(r => r.hostId === userObj.id);

    const bookingsRes = await fetch('/api/bookings/host', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
    });
    let allBookings = await bookingsRes.json();
    if (!Array.isArray(allBookings)) allBookings = [];

    // Update Stats
    document.getElementById('stats-active-rides').innerText = myActiveRides.length;
    document.getElementById('stats-total-bookings').innerText = allBookings.length;
    fetch('/api/wallet', { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } })
      .then(res => res.json())
      .then(data => {
        document.getElementById('stats-wallet-balance').innerText = `₹${data.balance || '0.00'}`;
      });

    if (myActiveRides.length === 0) {
      container.innerHTML = `
        <div class="empty-state animate-fade-in-up" style="grid-column: 1/-1;">
          <i data-feather="map"></i>
          <div>
            <h3>No Active Rides</h3>
            <p>You haven't published any rides yet. Share a journey to start hosting!</p>
          </div>
          <button class="btn-primary" onclick="window.showDashboard(); document.querySelector('#offer-ride-card button').click()">Publish a Ride</button>
        </div>
      `;
      feather.replace();
      return;
    }

    container.innerHTML = '';
    myActiveRides.forEach((ride, index) => {
      const rideBookings = allBookings.filter(b => b.rideId === ride.id);
      const pendingCount = rideBookings.filter(b => b.status === 'PENDING').length;
      
      const rideEl = document.createElement('div');
      rideEl.className = 'ticket-card animate-fade-in-up';
      rideEl.style.animationDelay = `${index * 0.1}s`;

      rideEl.innerHTML = `
        <div class="ticket-top">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
            <span class="badge" style="background:${ride.isEmergency ? 'var(--status-rejected-bg)' : 'var(--status-accepted-bg)'}; color:${ride.isEmergency ? 'var(--status-rejected)' : 'var(--status-accepted)'}; border:none;">
              ${ride.isEmergency ? 'EMERGENCY' : 'ACTIVE'}
            </span>
            <div style="text-align: right;">
              <div style="font-weight: 800; font-size: 1.25rem; color: var(--color-primary); font-family: 'Outfit';">₹${ride.price}</div>
              <div style="font-size: 0.7rem; color: var(--color-text-muted); text-transform: uppercase;">Per Seat</div>
            </div>
          </div>

          <div style="display: flex; gap: 1.5rem; align-items: center;">
            <div class="route-dot-line">
              <div class="dot"></div>
              <div class="line"></div>
              <div class="dot" style="background: var(--color-danger);"></div>
            </div>
            <div style="flex: 1;">
              <div style="margin-bottom: 1.25rem;">
                <div style="font-size: 0.75rem; color: var(--color-text-muted); text-transform: uppercase;">Origin</div>
                <div style="font-weight: 700; font-size: 1.1rem;">${ride.fromLocation}</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--color-text-muted); text-transform: uppercase;">Destination</div>
                <div style="font-weight: 700; font-size: 1.1rem;">${ride.toLocation}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="ticket-bottom">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <div class="ride-meta">
              <span class="meta-item"><i data-feather="calendar" style="width:14px;"></i> ${new Date(ride.departureTime).toLocaleDateString()}</span>
              <span class="meta-item"><i data-feather="users" style="width:14px;"></i> ${ride.capacity} Left</span>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn-icon" onclick="window.triggerSOS(${ride.id})" style="color:var(--color-danger); background:var(--status-rejected-bg);"><i data-feather="alert-triangle"></i></button>
              <button class="btn-primary" onclick="window.endRide(${ride.id})" style="background:var(--color-danger); padding:0.4rem 0.8rem; font-size:0.8rem;">End</button>
            </div>
          </div>
          
          <div style="border-top: 1px solid var(--color-border); padding-top: 0.75rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
               <span style="font-size: 0.8rem; font-weight: 600; color: var(--color-text-muted);">PASSENGERS</span>
               ${pendingCount > 0 ? `<span class="badge" style="background:var(--status-pending-bg); color:var(--status-pending); border:none; font-size:0.65rem;">${pendingCount} NEW</span>` : ''}
            </div>
            <div class="rides-list" style="gap: 0.5rem;">
               ${rideBookings.length === 0 ? '<p class="text-muted" style="font-size: 0.75rem;">Waiting for requests...</p>' : ''}
               ${rideBookings.slice(0, 3).map(b => `
                 <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.03); padding:0.4rem 0.75rem; border-radius:var(--radius-md); font-size:0.85rem;">
                    <span><b>${b.passenger.name}</b> (${b.seatsRequested})</span>
                    <button class="btn-text" style="padding:0; color:var(--color-primary);" onclick="window.showMyRides()">Manage <i data-feather="chevron-right" style="width:12px;"></i></button>
                 </div>
               `).join('')}
            </div>
          </div>
        </div>
      `;

      container.appendChild(rideEl);
    });

    feather.replace();
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><i data-feather="alert-circle"></i><h3>Unable to load hub</h3></div>';
    feather.replace();
  }
}

async function renderJoinedRequests() {
  const container = document.getElementById('passenger-rides-container');
  container.innerHTML = '<div style="text-align: center; padding: 2rem; grid-column: 1/-1;"><i data-feather="loader" class="spin"></i> Loading...</div>';
  feather.replace();

  try {
    const res = await fetch('/api/bookings/passenger', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
    });
    let bookings = await res.json();
    if (!Array.isArray(bookings)) bookings = [];

    if (bookings.length === 0) {
      container.innerHTML = `
        <div class="empty-state animate-fade-in-up" style="grid-column: 1/-1;">
          <i data-feather="navigation"></i>
          <div>
            <h3>No Hub Activity</h3>
            <p>You haven't requested any rides yet. The mountains are waiting!</p>
          </div>
          <button class="btn-primary" onclick="window.showSearch()">Find a Ride</button>
        </div>
      `;
      feather.replace();
      return;
    }

    container.innerHTML = '';
    bookings.forEach((b, index) => {
      const bEl = document.createElement('div');
      bEl.className = `ticket-card animate-fade-in-up`;
      bEl.style.animationDelay = `${index * 0.1}s`;

      bEl.innerHTML = `
        <div class="ticket-top">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
            <span class="badge" style="background:${getBookingStatusColor(b.status, true)}; color:${getBookingStatusColor(b.status)}; border:none;">
              ${b.status}
            </span>
            <div style="text-align: right;">
              <div style="font-weight: 800; font-size: 1.25rem; color: var(--color-primary); font-family: 'Outfit';">₹${b.ride.price * b.seatsRequested}</div>
              <div style="font-size: 0.7rem; color: var(--color-text-muted); text-transform: uppercase;">Total for ${b.seatsRequested} Seat(s)</div>
            </div>
          </div>

          <div style="display: flex; gap: 1.5rem; align-items: center;">
            <div class="route-dot-line">
              <div class="dot" style="background: var(--color-success)"></div>
              <div class="line"></div>
              <div class="dot" style="background: var(--color-danger)"></div>
            </div>
            <div style="flex: 1;">
              <div style="margin-bottom: 1.25rem;">
                <div style="font-size: 0.75rem; color: var(--color-text-muted); text-transform: uppercase;">From</div>
                <div style="font-weight: 700; font-size: 1.1rem;">${b.ride.fromLocation}</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--color-text-muted); text-transform: uppercase;">To</div>
                <div style="font-weight: 700; font-size: 1.1rem;">${b.ride.toLocation}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="ticket-bottom">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div class="ride-meta">
              <span class="meta-item"><i data-feather="user"></i> ${b.ride.host.name}</span>
              <span class="meta-item"><i data-feather="calendar"></i> ${new Date(b.ride.departureTime).toLocaleDateString()}</span>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              ${b.status === 'ACCEPTED' && b.paymentMethod === 'ONLINE' ? `
                <button class="btn-primary" onclick="window.initiatePayment(${b.id})" style="padding:0.4rem 0.8rem; font-size:0.8rem;">Pay <i data-feather="credit-card" style="width:12px;"></i></button>
              ` : ''}
              ${b.ride.status === 'ACTIVE' && b.status === 'ACCEPTED' ? `
                <button class="btn-icon" onclick="window.triggerSOS(${b.rideId})" style="color:var(--color-danger); background:var(--status-rejected-bg);"><i data-feather="alert-triangle"></i></button>
              ` : ''}
            </div>
          </div>
          <div style="margin-top: 0.75rem; font-size: 0.8rem; color: var(--color-text-muted); display: flex; align-items: center; gap: 4px;">
             <i data-feather="map-pin" style="width:12px;"></i> Pickup: <b>${b.pickupLocation}</b>
          </div>
        </div>
      `;
      container.appendChild(bEl);
    });

    feather.replace();
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><i data-feather="alert-circle"></i><h3>Unable to load hub</h3></div>';
    feather.replace();
  }
}

function getBookingStatusColor(status, isBg = false) {
  switch(status) {
    case 'PENDING': return isBg ? 'var(--status-pending-bg)' : 'var(--status-pending)';
    case 'ACCEPTED': return isBg ? 'var(--status-accepted-bg)' : 'var(--status-accepted)';
    case 'REJECTED': return isBg ? 'var(--status-rejected-bg)' : 'var(--status-rejected)';
    case 'PAID': return isBg ? 'var(--status-paid-bg)' : 'var(--status-paid)';
    default: return isBg ? 'rgba(0,0,0,0.05)' : 'var(--color-text-muted)';
  }
}

window.showHistory = async function(activeTab = 'hosted') {
  window.hideAllViews();
  const view = document.getElementById('history-view');
  view.style.display = 'block';
  window.scrollTo(0, 0);

  window.switchHistoryTab(activeTab);
};

window.switchHistoryTab = async function(tab) {
  const isHosted = tab === 'hosted';
  const hostedContent = document.getElementById('history-hosted-content');
  const joinedContent = document.getElementById('history-joined-content');
  const tabs = document.querySelectorAll('#history-view .tab-btn');

  tabs.forEach(btn => {
    if ((isHosted && btn.innerText.includes('Hosted')) || (!isHosted && btn.innerText.includes('Joined'))) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  hostedContent.style.display = isHosted ? 'block' : 'none';
  joinedContent.style.display = isHosted ? 'none' : 'block';

  if (isHosted) renderHostedHistory();
  else renderJoinedHistory();
};

async function renderHostedHistory() {
  const container = document.getElementById('hosted-history-container');
  container.innerHTML = '<div style="text-align: center; padding: 2rem; grid-column: 1/-1;"><i data-feather="loader" class="spin"></i> Loading...</div>';
  feather.replace();

  try {
    const res = await fetch('/api/rides/history', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
    });
    let historyJson = await res.json();
    const hosted = Array.isArray(historyJson.hosted) ? historyJson.hosted : [];
    const joined = Array.isArray(historyJson.joined) ? historyJson.joined : [];

    // Update Stats
    document.getElementById('stats-hosted-count').innerText = hosted.length;
    document.getElementById('stats-joined-count').innerText = joined.length;
    const impact = hosted.length > 5 ? 'Platinum' : (hosted.length > 2 ? 'Gold' : 'Silver');
    document.getElementById('stats-impact').innerText = impact;

    if (hosted.length === 0) {
      container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><i data-feather="archive"></i><h3>No Hosted Trips</h3><p>Completed trips you host will appear here.</p></div>';
      feather.replace();
      return;
    }

    container.innerHTML = '';
    hosted.forEach((ride, index) => {
      const rideEl = document.createElement('div');
      rideEl.className = 'ticket-card animate-fade-in-up';
      rideEl.style.animationDelay = `${index * 0.05}s`;
      
      rideEl.innerHTML = `
        <div class="ticket-top">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
            <span class="badge" style="background:var(--status-accepted-bg); color:var(--status-accepted); border:none;">COMPLETED</span>
            <div style="text-align: right;">
              <div style="font-weight: 800; font-size: 1.15rem; color: var(--color-primary); font-family: 'Outfit';">₹${ride.price} earned</div>
            </div>
          </div>
          <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 8px;">
            ${ride.fromLocation} <i data-feather="arrow-right" style="width:14px;"></i> ${ride.toLocation}
          </div>
          <div class="text-muted" style="font-size: 0.85rem;">Date: ${new Date(ride.departureTime).toLocaleDateString()}</div>
        </div>
        <div class="ticket-bottom">
           <button class="btn-text" style="width:100%; border-top: 1px solid var(--color-border); padding-top: 0.5rem; text-align:center;">View Details</button>
        </div>
      `;
      container.appendChild(rideEl);
    });
    feather.replace();
  } catch (err) {
    container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><i data-feather="alert-circle"></i><h3>Error loading hub</h3></div>';
    feather.replace();
  }
}

async function renderJoinedHistory() {
  const container = document.getElementById('joined-history-container');
  container.innerHTML = '<div style="text-align: center; padding: 2rem; grid-column: 1/-1;"><i data-feather="loader" class="spin"></i> Loading...</div>';
  feather.replace();

  try {
    const res = await fetch('/api/rides/history', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
    });
    let historyJson = await res.json();
    const joined = Array.isArray(historyJson.joined) ? historyJson.joined : [];

    if (joined.length === 0) {
      container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><i data-feather="clock"></i><h3>No Joined Trips</h3><p>Journeys you join as a passenger will appear here.</p></div>';
      feather.replace();
      return;
    }

    container.innerHTML = '';
    joined.forEach((ride, index) => {
      const rideEl = document.createElement('div');
      rideEl.className = 'ticket-card animate-fade-in-up';
      rideEl.style.animationDelay = `${index * 0.05}s`;
      
      rideEl.innerHTML = `
        <div class="ticket-top">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
            <span class="badge" style="background:var(--status-accepted-bg); color:var(--status-accepted); border:none;">COMPLETED</span>
            <div style="text-align: right;">
              <div style="font-weight: 800; font-size: 1.15rem; color: var(--color-primary); font-family: 'Outfit';">₹${ride.price} paid</div>
            </div>
          </div>
          <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 8px;">
            ${ride.fromLocation} <i data-feather="arrow-right" style="width:14px;"></i> ${ride.toLocation}
          </div>
          <div class="text-muted" style="font-size: 0.85rem;">Host: ${ride.host.name} • ${new Date(ride.departureTime).toLocaleDateString()}</div>
        </div>
        <div class="ticket-bottom">
           <button class="btn-text" style="width:100%; border-top: 1px solid var(--color-border); padding-top: 0.5rem; text-align:center;">Rate Trip</button>
        </div>
      `;
      container.appendChild(rideEl);
    });
    feather.replace();
  } catch (err) {
    container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><i data-feather="alert-circle"></i><h3>Error loading hub</h3></div>';
    feather.replace();
  }
}

window.showWallet = function() {
  window.hideAllViews();
  document.getElementById('transactions-view').style.display = 'block';
  window.scrollTo(0, 0);
};

// Custom Alert Utility
window.showAlert = function(message, type = 'success') {
  const modal = document.getElementById('custom-alert');
  const title = document.getElementById('alert-title');
  const msgText = document.getElementById('alert-message');
  const icon = document.getElementById('alert-icon');
  const iconWrapper = document.getElementById('alert-icon-wrapper');

  if (!modal || !msgText) return;

  msgText.innerText = message;
  title.innerText = type === 'success' ? 'Success!' : 'Oops!';
  
  // Set Icon and Color based on type
  if (type === 'success') {
    icon.setAttribute('data-feather', 'check-circle');
    iconWrapper.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
    iconWrapper.style.color = 'var(--color-success)';
  } else {
    icon.setAttribute('data-feather', 'x-circle');
    iconWrapper.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
    iconWrapper.style.color = 'var(--color-danger)';
  }

  modal.style.display = 'flex';
  if (typeof feather !== 'undefined') feather.replace();
};

window.closeAlert = function() {
  const modal = document.getElementById('custom-alert');
  if (modal) modal.style.display = 'none';
};

// Booking Modal Logic
let currentRideCapacity = 1;

window.openBookingModal = function() {
  const modal = document.getElementById('booking-modal');
  const seatsCount = document.getElementById('booking-seats-count');
  const pickupInput = document.getElementById('booking-pickup');
  
  if (!modal) return;
  
  // Reset fields
  seatsCount.innerText = '1';
  pickupInput.value = '';
  modal.style.display = 'flex';
  if (typeof feather !== 'undefined') feather.replace();
};

window.closeBookingModal = function() {
  const modal = document.getElementById('booking-modal');
  if (modal) modal.style.display = 'none';
};

window.updateBookingSeats = function(delta) {
  const seatsCount = document.getElementById('booking-seats-count');
  let current = parseInt(seatsCount.innerText);
  current += delta;
  if (current < 1) current = 1;
  // Note: We don't have hard capacity here easily, but the server will check it
  // and we can improve this when we fetch ride details
  seatsCount.innerText = current;
};

window.closeProfileSidebar = function() {
  const sidebar = document.getElementById('profile-sidebar');
  if (sidebar) sidebar.style.display = 'none';
};

window.openProfileModal = function() {
  window.closeProfileSidebar();
  const modal = document.getElementById('profile-modal');
  const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
  
  if (!modal) return;
  
  // Pre-fill name
  document.getElementById('p-name').value = user.name || '';
  
  modal.style.display = 'flex';
};

window.closeProfileModal = function() {
  const modal = document.getElementById('profile-modal');
  if (modal) modal.style.display = 'none';
};

window.currentViewRideId = null;

window.showRideDetails = function(ride) {
  window.hideAllViews();
  
  const detailsView = document.getElementById('ride-details-view');
  detailsView.style.display = 'block';

  window.currentViewRideId = ride.id;

  const dateObj = new Date(ride.departureTime);
  const departureDate = dateObj.toLocaleDateString();

  document.getElementById('details-driver-name').innerText = `${ride.host?.name || 'Unknown'}'s Ride`;
  document.getElementById('details-driver-title').innerText = ride.host?.name || 'Unknown';
  document.getElementById('details-price').innerText = `₹${ride.price}`;
  document.getElementById('details-date').innerText = departureDate;
  document.getElementById('details-seats').innerText = `${ride.capacity} seats available`;

  // Render Timeline
  const timeline = document.getElementById('details-timeline');
  timeline.innerHTML = '';
  
  // Add Start
  timeline.innerHTML += `
    <div class="timeline-item">
      <div class="timeline-icon start"></div>
      <div class="timeline-content">
        <h4>${ride.fromLocation}</h4>
        <p>Departure Point</p>
      </div>
    </div>
  `;

  // Add Checkpoints
  if (ride.checkpoints) {
    ride.checkpoints.forEach((cp, idx) => {
      timeline.innerHTML += `
        <div class="timeline-item">
          <div class="timeline-icon checkpoint"></div>
          <div class="timeline-content">
            <h4>${cp}</h4>
            <p>Stop ${idx + 1}</p>
          </div>
        </div>
      `;
    });
  }

  // Add End
  timeline.innerHTML += `
    <div class="timeline-item">
      <div class="timeline-icon end"></div>
      <div class="timeline-content">
        <h4>${ride.toLocation}</h4>
        <p>Destination Point</p>
      </div>
    </div>
  `;

  // Render Specs
  const specsContainer = document.getElementById('details-specs');
  specsContainer.innerHTML = '';
  if (ride.specifications && ride.specifications.length > 0) {
    ride.specifications.forEach(spec => {
      specsContainer.innerHTML += `<div class="spec-chip">${spec}</div>`;
    });
  } else {
    specsContainer.innerHTML = '<span class="text-muted" style="font-size:0.875rem;">No specific rules explicitly mentioned.</span>';
  }

  if(typeof feather !== 'undefined') feather.replace();
  
  // Host specific view: Hide Pay Online and show Passenger Requests
  const btnPay = document.getElementById('btn-pay');
  const btnBook = document.getElementById('btn-book');
  const hostManageSection = document.getElementById('host-manage-section');
  const requestsContainer = document.getElementById('ride-specific-requests');

  if (window.currentUser && ride.hostId === window.currentUser.id) {
    if (btnPay) btnPay.style.display = 'none';
    if (btnBook) btnBook.style.display = 'none';
    if (hostManageSection) hostManageSection.style.display = 'block';

    // Fetch and display specific requests for this ride
    if (requestsContainer) {
      requestsContainer.innerHTML = '<div style="text-align: center;"><i data-feather="loader" class="spin"></i> Loading requests...</div>';
      if(typeof feather !== 'undefined') feather.replace();
      
      fetch('/api/bookings/host', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      })
      .then(res => res.json())
      .then(bookings => {
        const rideBookings = bookings.filter(b => b.rideId === ride.id);
        
        if (rideBookings.length === 0) {
          requestsContainer.innerHTML = '<div class="text-muted" style="padding: 1rem; text-align: center;">No passenger requests for this ride yet.</div>';
          return;
        }

        requestsContainer.innerHTML = '';
        rideBookings.forEach(b => {
          const item = document.createElement('div');
          item.className = 'ride-item';
          item.style.padding = '1rem';
          item.style.marginBottom = '0.5rem';
          item.style.flexDirection = 'column';
          item.style.alignItems = 'stretch';
          item.style.gap = '0.5rem';

          item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <b style="font-size: 1rem;">${b.passenger.name}</b>
                <div style="font-size: 0.85rem; color: var(--color-primary); font-weight: 500; margin-top: 2px;">
                  <i data-feather="users" style="width:12px;"></i> ${b.seatsRequested || 1} seats | <i data-feather="map-pin" style="width:12px;"></i> Pickup: <b>${b.pickupLocation || 'Not specified'}</b>
                </div>
                <div class="text-muted" style="font-size: 0.85rem; margin-top: 4px;">Payment: <b>${b.paymentMethod || 'ONLINE'}</b> | Status: <span style="font-weight: 600; color: ${b.status === 'PENDING' ? 'var(--color-warning)' : (b.status === 'REJECTED' ? 'var(--color-danger)' : 'var(--color-success)')}">${b.status}</span></div>
              </div>
              <div style="display: flex; gap: 0.5rem;">
                ${b.status === 'PENDING' ? `
                  <button class="btn-outline" onclick="window.updateBooking(${b.id}, 'REJECTED')" style="padding: 0.4rem 0.8rem; font-size: 0.9rem; color: var(--color-danger); border-color: rgba(239,68,68,0.5);">Reject</button>
                  <button class="btn-primary" onclick="window.updateBooking(${b.id}, 'ACCEPTED')" style="padding: 0.4rem 0.8rem; font-size: 0.9rem;">Accept</button>
                ` : `
                   ${b.paymentMethod === 'CASH' && b.status === 'ACCEPTED' ? `<button class="btn-outline" onclick="window.showPaymentQR(${ride.price * b.seatsRequested}, \`${currentUser.upiId || ''}\`, \`${currentUser.name}\`)" style="padding: 0.4rem 0.8rem; font-size: 0.9rem; color: var(--color-primary);"><i data-feather="maximize"></i> QR</button>` : ''}
                `}
              </div>
            </div>
          `;
          requestsContainer.appendChild(item);
        });
        if(typeof feather !== 'undefined') feather.replace();
      });
    }

    // Add info message
    const bookingControls = document.querySelector('#btn-book')?.parentElement;
    if (bookingControls) {
      if (!document.getElementById('host-msg')) {
        const msg = document.createElement('div');
        msg.id = 'host-msg';
        msg.className = 'text-primary';
        msg.style.fontWeight = '600';
        msg.innerHTML = '<i data-feather="info" style="width:16px;"></i> You are hosting this ride';
        bookingControls.prepend(msg);
      }
    }
  } else {
    // Passenger View
    if (btnPay) {
      btnPay.style.display = 'none'; // Only show if accepted and online
      // Check if current user has an accepted online booking for this ride
      fetch('/api/bookings/passenger', {
         headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      })
      .then(res => res.json())
      .then(bookings => {
         const myBooking = bookings.find(b => b.rideId === ride.id && b.status === 'ACCEPTED' && b.paymentMethod === 'ONLINE');
         if (myBooking) {
           btnPay.style.display = 'block';
           btnPay.onclick = () => window.initiatePayment(myBooking.id);
         }
      });
    }
    if (btnBook) btnBook.style.display = 'block';
    btnBook.onclick = () => window.showBookingModal(ride);
    if (hostManageSection) hostManageSection.style.display = 'none';
    document.getElementById('host-msg')?.remove();
  }

  if(typeof feather !== 'undefined') feather.replace();
  
  // Wire up SOS Button
  const btnSos = document.getElementById('btn-sos');
  if (btnSos) {
    btnSos.onclick = () => window.triggerSOS(ride.id);
  }

  window.scrollTo(0, 0);
};

// Universal outside click to close modals
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    const id = e.target.id;
    if (id === 'profile-modal') window.closeProfileModal();
    if (id === 'publish-ride-modal') window.hidePublishForm();
    if (id === 'booking-modal') {
      if (typeof window.closeBookingModal === 'function') window.closeBookingModal();
    }
    if (id === 'qr-modal') {
      if (typeof window.closeQRModal === 'function') window.closeQRModal();
    }
    if (id === 'payout-modal') {
      if (typeof window.closePayoutModal === 'function') window.closePayoutModal();
    }
    if (id === 'custom-alert') {
      if (typeof window.closeAlert === 'function') window.closeAlert();
    }
    if (id === 'custom-confirm') {
      if (typeof window.closeConfirm === 'function') window.closeConfirm();
    }
  }
  if (e.target.classList.contains('sidebar-overlay')) {
    if (e.target.id === 'profile-sidebar') {
      if (typeof window.closeProfileSidebar === 'function') window.closeProfileSidebar();
    }
  }
});

