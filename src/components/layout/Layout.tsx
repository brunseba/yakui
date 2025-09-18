import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  Collapse,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  AccountTree as AccountTreeIcon,
  Dns as DnsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  ExpandLess,
  ExpandMore,
  Kubernetes as KubernetesIcon,
  Visibility as VisibilityIcon,
  SupervisorAccount as SupervisorAccountIcon,
  Extension as ExtensionIcon,
  Monitor as MonitorIcon,
  Group as GroupIcon,
  Shield as ShieldIcon,
  BugReport as BugReportIcon,
  Policy as PolicyIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 280;

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactElement;
  path?: string;
  children?: NavigationItem[];
  badge?: number;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/dashboard'
  },
  {
    id: 'cluster',
    label: 'Cluster',
    icon: <AccountTreeIcon />,
    children: [
      {
        id: 'nodes',
        label: 'Nodes',
        icon: <StorageIcon />,
        path: '/cluster/nodes'
      },
      {
        id: 'topology',
        label: 'Topology',
        icon: <VisibilityIcon />,
        path: '/cluster/topology'
      }
    ]
  },
  {
    id: 'namespaces',
    label: 'Namespaces',
    icon: <DnsIcon />,
    path: '/namespaces'
  },
  {
    id: 'workloads',
    label: 'Workloads',
    icon: <KubernetesIcon />,
    children: [
      {
        id: 'deployments',
        label: 'Deployments',
        icon: <KubernetesIcon />,
        path: '/workloads/deployments'
      },
      {
        id: 'pods',
        label: 'Pods',
        icon: <KubernetesIcon />,
        path: '/workloads/pods'
      },
      {
        id: 'services',
        label: 'Services',
        icon: <KubernetesIcon />,
        path: '/workloads/services'
      }
    ]
  },
  {
    id: 'crds',
    label: 'Custom Resources',
    icon: <ExtensionIcon />,
    path: '/crds'
  },
  {
    id: 'rbac',
    label: 'RBAC',
    icon: <SecurityIcon />,
    children: [
      {
        id: 'users',
        label: 'Users & Service Accounts',
        icon: <SupervisorAccountIcon />,
        path: '/rbac/users'
      },
      {
        id: 'roles',
        label: 'Roles',
        icon: <GroupIcon />,
        path: '/rbac/roles'
      },
      {
        id: 'bindings',
        label: 'Bindings',
        icon: <GroupIcon />,
        path: '/rbac/bindings'
      }
    ]
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    icon: <MonitorIcon />,
    children: [
      {
        id: 'events',
        label: 'Events',
        icon: <VisibilityIcon />,
        path: '/monitoring/events'
      },
      {
        id: 'logs',
        label: 'Logs',
        icon: <VisibilityIcon />,
        path: '/monitoring/logs'
      },
      {
        id: 'metrics',
        label: 'Metrics',
        icon: <MonitorIcon />,
        path: '/monitoring/metrics'
      }
    ]
  },
  {
    id: 'security',
    label: 'Security',
    icon: <ShieldIcon />,
    children: [
      {
        id: 'overview',
        label: 'Security Overview',
        icon: <SecurityIcon />,
        path: '/security'
      },
      {
        id: 'vulnerabilities',
        label: 'Vulnerabilities',
        icon: <BugReportIcon />,
        path: '/security/scanning'
      },
      {
        id: 'compliance',
        label: 'Compliance',
        icon: <PolicyIcon />,
        path: '/security/compliance'
      }
    ]
  }
];

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { state: authState, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string>('');

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleProfileMenuClose();
    navigate('/login');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleSubmenuToggle = (itemId: string) => {
    setOpenSubmenu(openSubmenu === itemId ? '' : itemId);
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    const isActive = item.path === location.pathname;
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openSubmenu === item.id;

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding sx={{ pl: level * 2 }}>
          <ListItemButton
            selected={isActive}
            onClick={() => {
              if (hasChildren) {
                handleSubmenuToggle(item.id);
              } else if (item.path) {
                handleNavigation(item.path);
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} />
            {item.badge && (
              <Badge badgeContent={item.badge} color="error" />
            )}
            {hasChildren && (isOpen ? <ExpandLess /> : <ExpandMore />)}
          </ListItemButton>
        </ListItem>
        {hasChildren && (
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children?.map((child) => renderNavigationItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const drawer = (
    <div>
      <Toolbar>
        <Box display="flex" alignItems="center" width="100%">
          <KubernetesIcon sx={{ mr: 1 }} />
          <Typography variant="h6" noWrap>
            K8s Admin
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      
      {authState.cluster && (
        <Box p={2}>
          <Typography variant="subtitle2" color="textSecondary">
            Cluster
          </Typography>
          <Chip 
            label={authState.cluster.name} 
            size="small" 
            variant="outlined" 
            sx={{ mt: 1 }}
          />
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {authState.cluster.nodes} nodes • {authState.cluster.namespaces} namespaces
          </Typography>
        </Box>
      )}
      
      <Divider />
      <List>
        {navigationItems.map((item) => renderNavigationItem(item))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Kubernetes Admin Dashboard
          </Typography>
          
          {authState.user && (
            <Box display="flex" alignItems="center">
              <IconButton
                size="large"
                edge="end"
                aria-label="account of current user"
                aria-haspopup="true"
                onClick={handleProfileMenuOpen}
                color="inherit"
              >
                <Avatar sx={{ width: 32, height: 32 }}>
                  {authState.user.username.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        {children}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
      >
        <MenuItem onClick={handleProfileMenuClose}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Layout;