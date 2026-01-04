import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  Settings,
  LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  SUPER_ADMIN_ROUTES,
  SCHOOL_ADMIN_ROUTES_BASE,
  TEACHER_ROUTES_BASE,
  LIBRARY_ROUTES,
  FINANCE_ROUTES,
  SCHOOL_ADMIN_GROUPS
} from '../../constants';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen, isCollapsed, setIsCollapsed }) => {
  const { currentUserData } = useAuth();
  const location = useLocation();

  const userRoleData = currentUserData?.role;
  const userRoles = Array.isArray(userRoleData) ? userRoleData : (userRoleData ? [userRoleData] : []);
  const isManagementRole = userRoles.some(r => ['school-admin', 'academic-director', 'head-of-section', 'subject-coordinator'].includes(r));

  // --- Logic to build routes ---
  let routes: any[] = []; // Typed loosely as 'any' for simplicity, ideally defined route types
  if (userRoles.includes('super-admin')) {
    routes = SUPER_ADMIN_ROUTES;
  } else if (isManagementRole) {
    routes = [...SCHOOL_ADMIN_ROUTES_BASE];
    if (userRoles.includes('school-admin')) {
      routes = [...routes, ...LIBRARY_ROUTES, ...FINANCE_ROUTES];
    }
    const hasHigherManagementRole = userRoles.some(r => ['school-admin', 'academic-director', 'subject-coordinator'].includes(r));
    if (userRoles.includes('head-of-section') && !hasHigherManagementRole) {
      const forbiddenRoutes = ['Manage Users', 'School Settings', 'Timetable', 'Management Assignments'];
      routes = SCHOOL_ADMIN_ROUTES_BASE.filter(route => !forbiddenRoutes.includes(route.name));
    }
  } else if (userRoles.includes('librarian')) {
    routes = LIBRARY_ROUTES;
  } else if (userRoles.includes('finance')) {
    routes = FINANCE_ROUTES;
  } else if (userRoles.includes('teacher')) {
    routes = TEACHER_ROUTES_BASE;
  }

  // --- Navigation States ---
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    SCHOOL_ADMIN_GROUPS.forEach(g => initial[g.title] = true);
    return initial;
  });

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  // --- Animation Variants ---
  const sidebarVariants = {
    expanded: { width: "16rem", transition: { type: "spring", stiffness: 300, damping: 30 } },
    collapsed: { width: "5rem", transition: { type: "spring", stiffness: 300, damping: 30 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  const subMenuVariants = {
    hidden: { height: 0, opacity: 0, transition: { duration: 0.2, ease: "easeInOut" } },
    visible: { height: "auto", opacity: 1, transition: { duration: 0.3, ease: "easeOut" } }
  };

  // --- Helper Components ---

  const NavItem = ({ route, collapsed }: { route: any, collapsed: boolean }) => {
    const isActive = location.pathname.startsWith(route.path) && route.path !== '/' || location.pathname === route.path;

    return (
      <Link
        to={route.path}
        title={collapsed ? route.name : ''}
        onClick={() => sidebarOpen && setSidebarOpen(false)}
        className="relative block"
      >
        <motion.div
          className={`
             group flex items-center px-3 py-2.5 mx-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer
             ${isActive
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
            }
             ${collapsed ? 'justify-center' : ''}
           `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Active Glow Indicator */}
          {isActive && (
            <motion.div
              layoutId="activeGlow"
              className="absolute inset-0 bg-indigo-500/0 rounded-xl"
              initial={false}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}

          <div className="relative z-10 flex-shrink-0">
            {/* Clone element to change size/color if needed, or just render */}
            {React.cloneElement(route.icon as React.ReactElement, { size: 20 })}
          </div>

          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="ml-3 whitespace-nowrap overflow-hidden text-ellipsis relative z-10"
            >
              {route.name}
            </motion.span>
          )}

          {/* Hover Tooltip equivalent for collapsed state is handled by native 'title' attribute above, 
              but we could add a custom motion tooltip here if requested. */}
        </motion.div>
      </Link>
    );
  };

  const SidebarContent = () => (
    <>
      <div className={`flex items-center h-20 px-6 border-b border-white/10 flex-shrink-0 ${isCollapsed ? 'justify-center' : ''}`}>
        <Link to="/" className="flex items-center gap-3 overflow-hidden">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20"
          >
            <GraduationCap className="text-white w-6 h-6" />
          </motion.div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-bold text-lg text-white tracking-tight"
            >
              EduProgress
            </motion.div>
          )}
        </Link>
      </div>

      <nav className="flex-1 px-2 py-6 space-y-1 overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {isManagementRole ? (
          // Grouped Rendering
          SCHOOL_ADMIN_GROUPS.map((group, groupIndex) => {
            const groupRoutes = routes.filter(r => group.routes.includes(r.name));
            if (groupRoutes.length === 0) return null;
            const isOpen = openGroups[group.title];

            return (
              <div key={group.title} className={`mb-4 ${groupIndex !== 0 ? 'mt-4' : ''}`}>
                {/* Group Title */}
                {!isCollapsed && (
                  <div
                    onClick={() => toggleGroup(group.title)}
                    className="px-4 py-2 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors"
                  >
                    <span>{group.title}</span>
                    <motion.div
                      animate={{ rotate: isOpen ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronRight size={14} />
                    </motion.div>
                  </div>
                )}

                {/* Group Items */}
                <AnimatePresence initial={false}>
                  {(isOpen || isCollapsed) && (
                    <motion.div
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      variants={subMenuVariants}
                      className="space-y-1"
                    >
                      {groupRoutes.map(route => (
                        <NavItem key={route.name} route={route} collapsed={isCollapsed} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Separator Line */}
                {!isCollapsed && groupIndex !== SCHOOL_ADMIN_GROUPS.length - 1 && (
                  <div className="mx-4 mt-4 border-b border-white/5" />
                )}
              </div>
            );
          })
        ) : (
          // Flat Rendering
          routes.map(route => (
            <NavItem key={route.name} route={route} collapsed={isCollapsed} />
          ))
        )}
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <motion.div
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-slate-900 border-r border-white/10 lg:hidden`}
        initial={{ x: "-100%" }}
        animate={{ x: sidebarOpen ? 0 : "-100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <SidebarContent />
      </motion.div>

      {/* Desktop Sidebar */}
      <motion.div
        className="hidden lg:flex h-full flex-col border-r border-white/5 bg-slate-950 text-white relative flex-shrink-0 z-20"
        variants={sidebarVariants}
        animate={isCollapsed ? "collapsed" : "expanded"}
      >
        {/* Background Gradient Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />

        <SidebarContent />

        {/* Collapse Button */}
        <div className="p-4 border-t border-white/10 flex justify-end">
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.1)" }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </motion.button>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;