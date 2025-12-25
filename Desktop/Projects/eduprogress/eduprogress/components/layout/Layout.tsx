
import React, { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MouseSpotlight from '../ui/MouseSpotlight';
import BackgroundDots from '../ui/BackgroundDots';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen relative print:h-auto print:overflow-visible">
      <div className="print:hidden">
        <BackgroundDots />
        <MouseSpotlight />
      </div>
      <div className="print:hidden h-full">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
      </div>
      <div className="flex flex-col flex-1 overflow-y-auto z-10 print:overflow-visible print:h-auto">
        <div className="print:hidden">
          <Header setSidebarOpen={setSidebarOpen} />
        </div>
        <main className="p-4 sm:p-6 lg:p-8 flex-1 print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
