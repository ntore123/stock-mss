import React from 'react';
import TopNav from './TopNav';
import Footer from './Footer';

const MainLayout = ({ children, user, setUser }) => {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            {/* Top Navigation */}
            <TopNav user={user} setUser={setUser} />
            
            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
            </main>
            
            {/* Footer */}
            <Footer />
        </div>
    );
};

export default MainLayout;
