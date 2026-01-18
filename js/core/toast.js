// Toast Notification System

const initToastContainer = () => {
    if (!document.getElementById('toast_container')) {
        const container = document.createElement('div');
        container.id = 'toast_container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
    }
};

export const showToast = (message, type = 'info') => {
    initToastContainer();
    const container = document.getElementById('toast_container');

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Icon Selection
    let icon = 'bi-info-circle';
    if (type === 'success') icon = 'bi-check-circle-fill';
    if (type === 'error') icon = 'bi-exclamation-triangle-fill';

    toast.innerHTML = `
        <i class="bi ${icon}"></i>
        <span>${message}</span>
    `;

    // Styles (Inline for now, can move to CSS)
    toast.style.cssText = `
        background: rgba(20, 20, 20, 0.9);
        backdrop-filter: blur(10px);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        border-left: 4px solid var(--primary);
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 250px;
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
        font-size: 0.9rem;
    `;

    if (type === 'error') toast.style.borderLeftColor = '#ff4757';
    if (type === 'success') toast.style.borderLeftColor = '#2ed573';

    container.appendChild(toast);

    // Animate In
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
    });

    // Auto Dismiss
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};