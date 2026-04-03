
// Payment, Wallet, and QR Logic for Uttarpool
window.showWallet = async function() {
  window.hideAllViews();
  const view = document.getElementById('transactions-view');
  if (view) view.style.display = 'block';
  window.scrollTo(0, 0);

  const balanceEl = document.getElementById('wallet-balance');
  const totalEl = document.getElementById('wallet-total');
  const upiEl = document.getElementById('wallet-upi');
  const listEl = document.getElementById('wallet-transactions-list');

  if (!listEl) return;

  listEl.innerHTML = '<div style="text-align: center; padding: 2rem;"><i data-feather="loader" class="spin"></i> Loading wallet...</div>';
  if(typeof feather !== 'undefined') feather.replace();

  try {
    const res = await fetch('/api/wallet', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
    });
    const data = await res.json();

    if (res.ok) {
      balanceEl.innerText = '₹' + data.balance.toFixed(2);
      totalEl.innerText = '₹' + data.totalEarnings.toFixed(2);
      upiEl.innerText = data.upiId || 'Not set';
      
      if (!data.transactions || data.transactions.length === 0) {
        listEl.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--color-text-muted);">No transactions yet. Start hosting to earn!</div>';
      } else {
        listEl.innerHTML = '';
        data.transactions.forEach(tx => {
          const item = document.createElement('div');
          item.className = 'glass-card';
          item.style.padding = '1rem';
          item.style.display = 'flex';
          item.style.justifyContent = 'space-between';
          item.style.alignItems = 'center';
          item.style.borderLeft = '4px solid ' + (tx.type === 'CREDIT' ? 'var(--color-success)' : 'var(--color-danger)');
          
          item.innerHTML = `
            <div>
              <div style="font-weight: 600;">${tx.reference || (tx.type === 'CREDIT' ? 'Trip Earnings' : 'Withdrawal')}</div>
              <div class="text-muted" style="font-size: 0.8rem;">${new Date(tx.createdAt).toLocaleString()}</div>
            </div>
            <div style="font-weight: 700; color: ${tx.type === 'CREDIT' ? 'var(--color-success)' : 'var(--color-danger)'};">
              ${tx.type === 'CREDIT' ? '+' : '-'} ₹${tx.amount.toFixed(2)}
            </div>
          `;
          listEl.appendChild(item);
        });
      }
    }
  } catch (err) {
    listEl.innerHTML = '<div style="color: var(--color-danger); text-align: center;">Failed to load wallet.</div>';
  }
  if(typeof feather !== 'undefined') feather.replace();
};

window.openPayoutSetup = function() {
  const upi = prompt('Enter your UPI ID (GPay, PhonePe, Paytm, etc.):');
  if (!upi) return;
  
  fetch('/api/wallet/payout-setup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
    },
    body: JSON.stringify({ upiId: upi })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      window.showAlert('Payout UPI saved!', 'success');
      window.showWallet();
    }
  });
};

window.requestWithdrawal = function() {
  const balance = parseFloat(document.getElementById('wallet-balance').innerText.replace('₹', ''));
  const upi = document.getElementById('wallet-upi').innerText;

  if (balance < 100) return window.showAlert('Minimum withdrawal is ₹100', 'error');
  if (upi === 'Not set') return window.showAlert('Setup your UPI first!', 'error');

  window.showConfirm({
    title: 'Withdraw Money',
    message: 'Withdraw ₹' + balance.toFixed(2) + ' to ' + upi + '?',
    onOk: () => window.showAlert('Request submitted!', 'success')
  });
};

window.currentBookingRide = null;

window.showBookingModal = function(ride) {
  window.currentBookingRide = ride;
  document.getElementById('booking-modal').style.display = 'flex';
  document.getElementById('booking-seats-count').innerText = '1';
  window.updateBookingPrice();
  
  const onlineLabel = document.getElementById('pm-online');
  const cashLabel = document.getElementById('pm-cash');
  const onlineRadio = onlineLabel.querySelector('input');
  const cashRadio = cashLabel.querySelector('input');

  const setMethod = (type) => {
    if(type === 'ONLINE') {
       onlineRadio.checked = true;
       onlineLabel.style.border = '2px solid var(--color-primary)';
       onlineLabel.style.background = 'rgba(21, 128, 61, 0.05)';
       cashLabel.style.border = '1px solid var(--color-border)';
       cashLabel.style.background = 'none';
    } else {
       cashRadio.checked = true;
       cashLabel.style.border = '2px solid var(--color-primary)';
       cashLabel.style.background = 'rgba(21, 128, 61, 0.05)';
       onlineLabel.style.border = '1px solid var(--color-border)';
       onlineLabel.style.background = 'none';
    }
  };
  onlineLabel.onclick = () => setMethod('ONLINE');
  cashLabel.onclick = () => setMethod('CASH');
};

window.updateBookingPrice = function() {
  if (!window.currentBookingRide) return;
  const seatsCount = document.getElementById('booking-seats-count');
  if (!seatsCount) return;
  const seats = parseInt(seatsCount.innerText);
  const subtotal = window.currentBookingRide.price * seats;
  const fee = Math.max(25, Math.round(subtotal * 0.05));
  const total = subtotal + fee;

  document.getElementById('breakdown-subtotal').innerText = '₹' + subtotal.toFixed(2);
  document.getElementById('breakdown-fee').innerText = '₹' + fee.toFixed(2);
  document.getElementById('breakdown-total').innerText = '₹' + total.toFixed(2);
};

window.closeBookingModal = function() {
  const modal = document.getElementById('booking-modal');
  if (modal) modal.style.display = 'none';
};

window.showPaymentQR = function(amount, upiId, name) {
  if (!upiId) return window.showAlert('Driver UPI not set.', 'error');
  document.getElementById('qr-upi').innerText = upiId;
  document.getElementById('qr-amount').innerText = '₹' + amount.toFixed(2);
  const upiUrl = 'upi://pay?pa=' + upiId + '&pn=' + encodeURIComponent(name || 'Driver') + '&am=' + amount + '&cu=INR';
  const qrApi = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(upiUrl);
  document.getElementById('qr-container').innerHTML = `<img src="${qrApi}" style="width: 200px; height: 200px;">`;
  document.getElementById('qr-modal').style.display = 'flex';
};

window.closeQRModal = function() {
  document.getElementById('qr-modal').style.display = 'none';
};

window.initiatePayment = async function(bookingId) {
  try {
    const res = await fetch('/api/payments/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') },
      body: JSON.stringify({ bookingId })
    });
    const order = await res.json();
    if (!res.ok) throw new Error(order.error);

    const options = {
      key: 'rzp_test_placeholder',
      amount: order.amount,
      currency: order.currency,
      name: 'Uttarpool',
      order_id: order.id,
      handler: async function (response) {
        const vRes = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') },
          body: JSON.stringify({ bookingId, razorpayPaymentId: response.razorpay_payment_id })
        });
        if (vRes.ok) { 
            window.showAlert('Success!', 'success'); 
            window.showMyRides(); 
        }
      },
      theme: { color: '#15803d' }
    };
    new Razorpay(options).open();
  } catch (err) { window.showAlert('Pay Error: ' + err.message, 'error'); }
};

// Initialise Booking Button
document.addEventListener('DOMContentLoaded', () => {
    const btnConfirm = document.getElementById('confirm-booking-btn');
    if (btnConfirm) {
        btnConfirm.addEventListener('click', async () => {
            const rideId = window.currentBookingRide?.id;
            const seatsRequested = parseInt(document.getElementById('booking-seats-count').innerText);
            const pickupLocation = document.getElementById('booking-pickup').value;
            const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value || 'ONLINE';

            if (!rideId) return;
            if (!pickupLocation) return window.showAlert('Please specify a pickup point', 'error');

            btnConfirm.disabled = true;
            btnConfirm.innerText = 'Sending...';

            try {
                const res = await fetch('/api/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') },
                    body: JSON.stringify({ rideId, seatsRequested, pickupLocation, paymentMethod })
                });
                if (res.ok) {
                    window.showAlert('Sent successfully!', 'success');
                    window.closeBookingModal();
                    window.showMyRides();
                } else {
                    const err = await res.json();
                    window.showAlert(err.error || 'Failed', 'error');
                }
            } catch (err) { window.showAlert('Server error', 'error'); }
            finally { btnConfirm.disabled = false; btnConfirm.innerText = 'Confirm Request'; }
        });
    }
});
