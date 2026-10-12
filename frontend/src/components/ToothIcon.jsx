// أيقونة سن بسيطة (SVG) نستخدمها بالـ Navbar وصفحة الدخول
export default function ToothIcon({ className = 'h-6 w-6' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 5.5c-1.2-1-2.5-1.5-4-1.5-2.5 0-4.5 2-4.5 5 0 2.2.9 3.3 1.5 5.2.6 1.8.7 4.8 1.7 5.7.8.7 1.8.3 2.1-.8.3-1.2.5-2.8 1.1-3.4.6-.6 1.4-.6 2 0 .6.6.8 2.2 1.1 3.4.3 1.1 1.3 1.5 2.1.8 1-.9 1.1-3.9 1.7-5.7.6-1.9 1.5-3 1.5-5.2 0-3-2-5-4.5-5-1.5 0-2.8.5-4 1.5z" />
    </svg>
  );
}
