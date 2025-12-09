import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
} from '@mui/material';
import {
  Person,
  Assignment,
  Assessment,
  School,
} from '@mui/icons-material';

import { RootState } from '../store';

const DashboardCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ title, description, icon, onClick }) => (
  <Grid item xs={12} sm={6} md={4}>
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'scale(1.02)',
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 2,
            color: 'primary.main',
          }}
        >
          {icon}
          <Typography variant="h6" component="h2" sx={{ ml: 1 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" paragraph>
          {description}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={onClick}
          fullWidth
        >
          Access
        </Button>
      </CardContent>
    </Card>
  </Grid>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const dashboardItems = [
    {
      title: 'Face Registration',
      description: 'Register your face for attendance tracking',
      icon: <Person fontSize="large" />,
      path: '/face-registration',
      roles: ['student'],
    },
    {
      title: 'Mark Attendance',
      description: 'Take attendance using face recognition',
      icon: <Assignment fontSize="large" />,
      path: '/mark-attendance',
      roles: ['teacher', 'admin'],
    },
    {
      title: 'Attendance Report',
      description: 'View and analyze attendance records',
      icon: <Assessment fontSize="large" />,
      path: '/attendance-report',
      roles: ['teacher', 'admin', 'student'],
    },
  ];

  const filteredItems = dashboardItems.filter(
    (item) => item.roles.includes(user?.role || '')
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <School fontSize="large" sx={{ mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          Welcome, {user ? `${user.first_name} ${user.last_name}` : ''}
        </Typography>
      </Box>
      <Grid container spacing={3}>
        {filteredItems.map((item) => (
          <DashboardCard
            key={item.title}
            title={item.title}
            description={item.description}
            icon={item.icon}
            onClick={() => navigate(item.path)}
          />
        ))}
      </Grid>
    </Box>
  );
};

export default Dashboard; 