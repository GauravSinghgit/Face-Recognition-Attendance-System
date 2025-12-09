import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface StudentAttendance {
  id: number;
  user_id: number;
  student_name: string;
  student_email: string;
  student_identifier: string | null;
  status: 'present' | 'absent' | 'late';
  confidence_score: number | null;
  created_at: string;
}

interface AttendanceReportData {
  start_date: string;
  end_date: string;
  session_id: string | null;
  total_students: number;
  total_present: number;
  total_absent: number;
  attendance_rate: number;
  attendance_details: StudentAttendance[];
}

const AttendanceReport: React.FC = () => {
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AttendanceReportData | null>(null);
  const { token } = useSelector((state: RootState) => state.auth);

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (!sessionId.trim()) {
      setError('Please enter a session ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        'http://localhost:8000/api/v1/attendance/report',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            start_date: format(startDate, 'yyyy-MM-dd'),
            end_date: format(endDate, 'yyyy-MM-dd'),
            session_id: sessionId,
          },
          withCredentials: true,
        }
      );

      setReport(response.data);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to fetch attendance report');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'success';
      case 'absent':
        return 'error';
      case 'late':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Attendance Report
        </Typography>

        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={4}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                slotProps={{ 
                  textField: { 
                    fullWidth: true,
                    required: true 
                  } 
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                slotProps={{ 
                  textField: { 
                    fullWidth: true,
                    required: true 
                  } 
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                label="Session ID"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Enter session ID"
                error={error?.includes('session ID')}
                helperText="Required to identify specific class session"
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={handleSearch}
                disabled={loading || !sessionId.trim()}
                fullWidth
              >
                {loading ? <CircularProgress size={24} /> : 'Search'}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {report && (
          <>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Students
                    </Typography>
                    <Typography variant="h4">{report.total_students}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Present
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {report.total_present}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Absent
                    </Typography>
                    <Typography variant="h4" color="error.main">
                      {report.total_absent}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Attendance Rate
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {report.attendance_rate.toFixed(1)}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Student Details
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>ID</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Confidence</TableCell>
                      <TableCell>Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.attendance_details.map((student) => (
                      <TableRow key={student.user_id}>
                        <TableCell>{student.student_name}</TableCell>
                        <TableCell>{student.student_email}</TableCell>
                        <TableCell>{student.student_identifier || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                            color={getStatusColor(student.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {student.status === 'present' && student.confidence_score
                            ? `${student.confidence_score.toFixed(1)}%`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(student.created_at), 'PPp')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default AttendanceReport; 