import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { SUPER_ADMIN_ROUTES, SCHOOL_ADMIN_ROUTES_BASE, TEACHER_ROUTES_BASE, LIBRARY_ROUTES, FINANCE_ROUTES, SCHOOL_ADMIN_GROUPS } from '../../constants';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen, isCollapsed, setIsCollapsed }) => {
  const { currentUserData } = useAuth();
  const location = useLocation();

  // FIX: Defensively handle roles that might be a string (legacy) or an array.
  const userRoleData = currentUserData?.role;
  const userRoles = Array.isArray(userRoleData) ? userRoleData : (userRoleData ? [userRoleData] : []);

  const isManagementRole = userRoles.some(r => ['school-admin', 'academic-director', 'head-of-section', 'subject-coordinator'].includes(r));

  let routes;
  if (userRoles.includes('super-admin')) {
    routes = SUPER_ADMIN_ROUTES;
  } else if (isManagementRole) {
    // Start with the full base for management roles
    // Start with the full base for management roles
    routes = [...SCHOOL_ADMIN_ROUTES_BASE];

    // Add Library routes if applicable (School Admin sees everything)
    if (userRoles.includes('school-admin')) {
      routes = [...routes, ...LIBRARY_ROUTES, ...FINANCE_ROUTES];
    }

    // A Head of Section should have a more limited view unless they also hold a higher role.
    const hasHigherManagementRole = userRoles.some(r => ['school-admin', 'academic-director', 'subject-coordinator'].includes(r));

    if (userRoles.includes('head-of-section') && !hasHigherManagementRole) {
      // HOS has a very focused view: Dashboard (My School) and Progress Reports.
      const forbiddenRoutes = ['Manage Users', 'School Settings', 'Timetable', 'Management Assignments'];
      routes = SCHOOL_ADMIN_ROUTES_BASE.filter(route => !forbiddenRoutes.includes(route.name));
    }
  } else if (userRoles.includes('librarian')) {
    routes = LIBRARY_ROUTES;
  } else if (userRoles.includes('finance')) {
    routes = FINANCE_ROUTES;
  } else if (userRoles.includes('teacher')) {
    routes = TEACHER_ROUTES_BASE;
  } else {
    routes = []; // No routes for students or other roles
  }

  // State to track which groups are open
  // Initialize with all groups open by default
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    SCHOOL_ADMIN_GROUPS.forEach(g => initial[g.title] = true);
    return initial;
  });

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const sidebarContent = (
    <>
      <div className={`flex items-center h-16 px-4 border-b border-border flex-shrink-0 ${isCollapsed ? 'justify-center' : ''}`}>
        <Link to="/" className="flex items-center space-x-2 text-foreground font-bold text-lg overflow-hidden">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-primary flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.905 59.905 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0l-2.072-1.036A48.627 48.627 0 0112 10.147a48.627 48.627 0 018.232-4.41l-2.072 1.036m-15.482 0c-.22.08-.433.16-.64.24a59.905 59.905 0 00-2.072-1.036" />
          </svg>
          {!isCollapsed && <span className="whitespace-nowrap transition-opacity duration-300">EduProgress</span>}
        </Link>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-x-hidden">
        {isManagementRole ? (
          // Grouped rendering for management roles
          SCHOOL_ADMIN_GROUPS.map((group, groupIndex) => {
            // Filter routes in this group that the user has access to
            const groupRoutes = routes.filter(r => group.routes.includes(r.name));

            if (groupRoutes.length === 0) return null;

            const isOpen = openGroups[group.title];

            return (
              <div key={group.title} className={`mb-2 ${groupIndex !== 0 ? 'mt-2' : ''}`}>
                {!isCollapsed && (
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className="w-full flex items-center justify-between px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors focus:outline-none"
                  >
                    <span>{group.title}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}

                {/* Render routes if group is open OR if sidebar is collapsed (icon mode always shows items) */}
                {(isOpen || isCollapsed) && (
                  <div className="mt-1 space-y-1">
                    {groupRoutes.map((route) => (
                      <Link
                        key={route.name}
                        to={route.path}
                        title={isCollapsed ? route.name : ''}
                        onClick={() => {
                          if (sidebarOpen) {
                            setSidebarOpen(false);
                          }
                        }}
                        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all duration-200
                          ${location.pathname.startsWith(route.path) && route.path !== '/' || location.pathname === route.path
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          }
                          ${isCollapsed ? 'justify-center' : ''}`
                        }
                      >
                        <div className="flex-shrink-0">{route.icon}</div>
                        {!isCollapsed && <span className="ml-2 whitespace-nowrap overflow-hidden text-ellipsis">{route.name}</span>}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          // Flat rendering for other roles
          routes.map((route) => (
            <Link
              key={route.name}
              to={route.path}
              title={isCollapsed ? route.name : ''}
              onClick={() => {
                if (sidebarOpen) {
                  setSidebarOpen(false);
                }
              }}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all duration-200
                ${location.pathname.startsWith(route.path) && route.path !== '/' || location.pathname === route.path
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }
                ${isCollapsed ? 'justify-center' : ''}`
              }
            >
              <div className="flex-shrink-0">{route.icon}</div>
              {!isCollapsed && <span className="ml-2 whitespace-nowrap overflow-hidden text-ellipsis">{route.name}</span>}
            </Link>
          ))
        )}
      </nav>
    </>
  );

  const toggleButton = (
    <div className="hidden lg:flex p-4 border-t border-white/20 justify-end bg-transparent">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="p-2 rounded-md hover:bg-accent text-muted-foreground transition-colors"
        aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
          </svg>
        )}
      </button>
    </div>
  );

  return (
    <>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 flex flex-col w-64 bg-white/10 backdrop-blur-md border-r border-white/20 transition-transform duration-300 ease-in-out lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {sidebarContent}
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className={`hidden lg:flex lg:flex-shrink-0 h-full transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="flex flex-col w-full border-r border-white/20 bg-white/10 backdrop-blur-md h-full">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {sidebarContent}
          </div>
          {toggleButton}
        </div>
      </div>
    </>
  );
};

export default Sidebar;