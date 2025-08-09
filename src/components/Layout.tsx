import React from 'react';
import Header from './Header';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Navbar />
      <main className="flex-1 ml-0 lg:ml-20 pt-16 pb-16">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;