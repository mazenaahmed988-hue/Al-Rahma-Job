import './globals.css';

export const metadata = {
  title: 'الرحمة المهداة للتوظيف',
  description: 'بوابة الموظفين لتحميل مفردات المرتب',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
